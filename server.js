{\rtf1\ansi\ansicpg1252\cocoartf2867
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fswiss\fcharset0 Helvetica;}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\margl1440\margr1440\vieww11520\viewh8400\viewkind0
\pard\tx720\tx1440\tx2160\tx2880\tx3600\tx4320\tx5040\tx5760\tx6480\tx7200\tx7920\tx8640\pardirnatural\partightenfactor0

\f0\fs24 \cf0 import express from "express";\
import fetch from "node-fetch";\
import cors from "cors";\
\
const app = express();\
app.use(cors());\
app.use(express.json());\
\
const CLIENT_ID = process.env.CLIENT_ID;\
const CLIENT_SECRET = process.env.CLIENT_SECRET;\
const REDIRECT_URI = process.env.REDIRECT_URI;\
\
let userToken = null;\
let personUrn = null;\
\
// LOGIN\
app.get("/login", (req, res) => \{\
  const url = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=$\{CLIENT_ID\}&redirect_uri=$\{encodeURIComponent(\
    REDIRECT_URI\
  )\}&scope=openid%20profile%20w_member_social`;\
\
  res.redirect(url);\
\});\
\
// CALLBACK\
app.get("/callback", async (req, res) => \{\
  const code = req.query.code;\
\
  const tokenRes = await fetch(\
    "https://www.linkedin.com/oauth/v2/accessToken",\
    \{\
      method: "POST",\
      headers: \{\
        "Content-Type": "application/x-www-form-urlencoded",\
      \},\
      body: new URLSearchParams(\{\
        grant_type: "authorization_code",\
        code,\
        client_id: CLIENT_ID,\
        client_secret: CLIENT_SECRET,\
        redirect_uri: REDIRECT_URI,\
      \}),\
    \}\
  );\
\
  const tokenData = await tokenRes.json();\
  userToken = tokenData.access_token;\
\
  const userRes = await fetch(\
    "https://api.linkedin.com/v2/userinfo",\
    \{\
      headers: \{\
        Authorization: `Bearer $\{userToken\}`,\
      \},\
    \}\
  );\
\
  const userData = await userRes.json();\
  personUrn = `urn:li:person:$\{userData.sub\}`;\
\
  res.send("LinkedIn conectado correctamente");\
\});\
\
// \uc0\u55357 \u56613  PASO 1 \'97 REGISTRAR IMAGEN\
app.post("/image/register", async (req, res) => \{\
  const response = await fetch(\
    "https://api.linkedin.com/v2/assets?action=registerUpload",\
    \{\
      method: "POST",\
      headers: \{\
        Authorization: `Bearer $\{userToken\}`,\
        "Content-Type": "application/json",\
      \},\
      body: JSON.stringify(\{\
        registerUploadRequest: \{\
          recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],\
          owner: personUrn,\
          serviceRelationships: [\
            \{\
              relationshipType: "OWNER",\
              identifier: "urn:li:userGeneratedContent",\
            \},\
          ],\
        \},\
      \}),\
    \}\
  );\
\
  const data = await response.json();\
  res.send(data);\
\});\
\
// \uc0\u55357 \u56613  PASO 2 \'97 SUBIR IMAGEN\
app.post("/image/upload", async (req, res) => \{\
  const \{ uploadUrl, imageUrl \} = req.body;\
\
  const image = await fetch(imageUrl);\
  const buffer = await image.arrayBuffer();\
\
  await fetch(uploadUrl, \{\
    method: "PUT",\
    body: buffer,\
    headers: \{\
      "Content-Type": "image/jpeg",\
    \},\
  \});\
\
  res.send(\{ success: true \});\
\});\
\
// \uc0\u55357 \u56613  PASO 3 \'97 PUBLICAR CON IMAGEN\
app.post("/post", async (req, res) => \{\
  const \{ text, asset \} = req.body;\
\
  const response = await fetch(\
    "https://api.linkedin.com/v2/ugcPosts",\
    \{\
      method: "POST",\
      headers: \{\
        Authorization: `Bearer $\{userToken\}`,\
        "Content-Type": "application/json",\
        "X-Restli-Protocol-Version": "2.0.0",\
      \},\
      body: JSON.stringify(\{\
        author: personUrn,\
        lifecycleState: "PUBLISHED",\
        specificContent: \{\
          "com.linkedin.ugc.ShareContent": \{\
            shareCommentary: \{ text \},\
            shareMediaCategory: "IMAGE",\
            media: [\
              \{\
                status: "READY",\
                media: asset,\
              \},\
            ],\
          \},\
        \},\
        visibility: \{\
          "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",\
        \},\
      \}),\
    \}\
  );\
\
  const data = await response.text();\
  res.send(data);\
\});\
\
app.listen(3000, () => \{\
  console.log("Servidor listo");\
\});}