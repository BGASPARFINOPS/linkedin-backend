import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// Variables de entorno
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;

// Variables temporales (solo para pruebas)
let userToken = null;
let personUrn = null;

// 🔹 Ruta base
app.get("/", (req, res) => {
  res.send("Backend funcionando");
});

// 🔹 Ruta TEST (para verificar Render)
app.get("/test", (req, res) => {
  res.send("TEST OK");
});

// 🔹 LOGIN → redirige a LinkedIn
app.get("/login", (req, res) => {
  const url = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(
    REDIRECT_URI
  )}&scope=openid%20profile%20w_member_social`;

  res.redirect(url);
});

// 🔹 CALLBACK → recibe código de LinkedIn
app.get("/callback", async (req, res) => {
  const code = req.query.code;

  if (!code) {
    return res.send("❌ No se recibió code de LinkedIn");
  }

  try {
    // Intercambiar code por access_token
    const tokenRes = await fetch(
      "https://www.linkedin.com/oauth/v2/accessToken",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          redirect_uri: REDIRECT_URI,
        }),
      }
    );

    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      console.log(tokenData);
      return res.send("❌ Error obteniendo token");
    }

    userToken = tokenData.access_token;

    // Obtener usuario
    const userRes = await fetch(
      "https://api.linkedin.com/v2/userinfo",
      {
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      }
    );

    const userData = await userRes.json();

    personUrn = `urn:li:person:${userData.sub}`;

    console.log("Usuario conectado:", personUrn);

    res.send("✅ LinkedIn conectado correctamente");
  } catch (err) {
    console.error(err);
    res.send("❌ Error en callback");
  }
});

// 🔹 PUBLICAR POST
app.post("/post", async (req, res) => {
  const { text } = req.body;

  if (!userToken || !personUrn) {
    return res.send("❌ No hay usuario autenticado");
  }

  try {
    const response = await fetch(
      "https://api.linkedin.com/v2/ugcPosts",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${userToken}`,
          "Content-Type": "application/json",
          "X-Restli-Protocol-Version": "2.0.0",
        },
        body: JSON.stringify({
          author: personUrn,
          lifecycleState: "PUBLISHED",
          specificContent: {
            "com.linkedin.ugc.ShareContent": {
              shareCommentary: { text },
              shareMediaCategory: "NONE",
            },
          },
          visibility: {
            "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
          },
        }),
      }
    );

    const data = await response.text();

    res.send(data);
  } catch (err) {
    console.error(err);
    res.send("❌ Error publicando");
  }
});

// 🔹 INICIAR SERVIDOR (IMPORTANTE PARA RENDER)
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🚀 Servidor listo en puerto", PORT);
});
