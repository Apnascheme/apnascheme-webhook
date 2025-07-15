const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const port = process.env.PORT || 10000;

// In-memory session store
const sessions = {};

app.use(bodyParser.json());

// ✅ GET route to test browser/ping
app.get('/webhook', (req, res) => {
  res.status(200).send('Webhook GET working ✅');
});

// ✅ POST route for Gupshup / Postman
app.post('/webhook', (req, res) => {
  const payload = req.body;
  const phone = payload.sender?.phone || 'unknown';
  const message = payload.message?.text?.trim() || '';

  if (!sessions[phone]) {
    sessions[phone] = { step: 'start', data: {} };
  }

  const session = sessions[phone];
  let reply = '';

  switch (session.step) {
    case 'start':
      reply = `Namaste! Main hoon ApnaScheme – your digital dost 🇮🇳\nI will tell you which Government Schemes you are eligible for – no agent, no form, no confusion.\n\n🗣️ Please select your language:\n1️⃣ हिंदी\n2️⃣ English\n3️⃣ मराठी`;
      session.step = 'set_language';
      break;

    case 'set_language':
      if (['1', '2', '3'].includes(message)) {
        session.data.language = message;
        session.step = 'ask_gender';
        reply = 'What is your gender?\n1️⃣ Male\n2️⃣ Female\n3️⃣ Widow\n4️⃣ PwD';
      } else {
        reply = 'Please enter 1, 2 or 3 to select a valid language.';
      }
      break;

    default:
      reply = 'Please type "Hi" to begin again.';
      session.step = 'start';
      break;
  }

  res.json({
    type: 'message',
    text: reply
  });
});

// ✅ Start server
app.listen(port, () => {
  console.log(`✅ ApnaScheme Webhook running on port ${port}`);
});
