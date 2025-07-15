const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const port = process.env.PORT || 3000;

// In-memory session store (replace with DB in production)
const sessions = {};

app.use(bodyParser.json());

// ✅ This handles browser or Gupshup GET requests
app.get('/webhook', (req, res) => {
  res.send('Webhook GET working ✅');
});

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

    case 'ask_gender':
      if (['1', '2', '3', '4'].includes(message)) {
        session.data.gender = message;
        session.step = 'ask_age';
        reply = 'Please enter your age (in years):';
      } else {
        reply = 'Please enter a valid option (1–4).';
      }
      break;

    case 'ask_age':
      const age = parseInt(message);
      if (!isNaN(age) && age > 0 && age < 120) {
        session.data.age = age;
        session.step = 'ask_state';
        reply = 'Which State are you from? (e.g., Maharashtra)';
      } else {
        reply = 'Please enter a valid number.';
      }
      break;

    case 'ask_state':
      session.data.state = message;
      session.step = 'ask_category';
      reply = 'Do you belong to SC/ST/OBC/EWS category?\n1️⃣ Yes\n2️⃣ No';
      break;

    case 'ask_category':
      if (['1', '2'].includes(message)) {
        session.data.category = message;
        session.step = 'ask_occupation';
        reply = 'What is your current occupation?\n1️⃣ Student\n2️⃣ Unemployed\n3️⃣ Employed\n4️⃣ Self-employed\n5️⃣ Farmer\n6️⃣ Labourer';
      } else {
        reply = 'Please enter 1 or 2.';
      }
      break;

    case 'ask_occupation':
      if (["1", "2", "3", "4", "5", "6"].includes(message)) {
        session.data.occupation = message;
        session.step = (message === '1' || message === '2') ? 'ask_guardian_income' : 'ask_income';
        reply = (message === '1' || message === '2') ? "What is your guardian's annual income (INR)?" : "What is your annual household income (INR)?";
      } else {
        reply = 'Please select 1 to 6.';
      }
      break;

    case 'ask_income':
    case 'ask_guardian_income':
      const income = parseInt(message);
      if (!isNaN(income) && income >= 0) {
        session.data.income = income;
        session.step = session.data.age < 18 ? 'ask_ration' : 'ask_bank';
        reply = session.data.age < 18 ? 'Do you have a ration card?\n1️⃣ Yes\n2️⃣ No' : 'Do you have a bank account?\n1️⃣ Yes\n2️⃣ No';
      } else {
        reply = 'Please enter a valid amount.';
      }
      break;

    case 'ask_bank':
      if (['1', '2'].includes(message)) {
        session.data.bank = message;
        session.step = 'ask_ration';
        reply = 'Do you have a ration card?\n1️⃣ Yes\n2️⃣ No';
      } else {
        reply = 'Please enter 1 or 2.';
      }
      break;

    case 'ask_ration':
      if (['1', '2'].includes(message)) {
        session.data.ration = message;
        session.step = 'ask_existing_scheme';
        reply = 'Are you already benefiting from any government scheme?\n1️⃣ Yes\n2️⃣ No';
      } else {
        reply = 'Please enter 1 or 2.';
      }
      break;

    case 'ask_existing_scheme':
      if (['1', '2'].includes(message)) {
        session.data.existing_scheme = message;
        session.step = 'show_eligibility';
        reply = 'Based on your answers:\n\n🎯 You may be eligible for multiple Government Schemes:\n- Some for Women\n- Some for Students\n- Some for Health\n\n✅ Want full scheme names, PDF and guidance?\nThis complete help costs only ₹49 (one‑time).';
      } else {
        reply = 'Please enter 1 or 2.';
      }
      break;

    case 'show_eligibility':
      session.step = 'payment_warning';
      reply = 'Please note: ₹49 is a one‑time charge for full scheme list, PDF and guidance.\nThis amount is non‑refundable.';
      break;

    case 'payment_warning':
      session.step = 'send_payment_link';
      reply = '🔒 To activate your ₹49 Yojana Assist plan, pay here:https://rzp.io/rzp/razorpay49';
      break;

    case 'send_payment_link':
      session.step = 'manual_payment_check';
      reply = 'Have you completed the payment?\n1️⃣ Yes\n2️⃣ Not yet';
      break;

    case 'manual_payment_check':
      if (message === '1') {
        session.step = 'post_payment';
        reply = '✅ Payment received!\n🎉 Congratulations! You are eligible for multiple schemes.\n📄 [Download PDF]\nNeed help applying? Just ask here.\n\n📢 Share with friends:\n👉 wa.me/91XXXXXXXXXX?text=Hi';
      } else {
        session.step = 'send_payment_link';
        reply = 'No worries. You can pay anytime at:https://rzp.io/rzp/razorpay49';
      }
      break;

    case 'post_payment':
      reply = 'Thank you for using ApnaScheme!\nWe’re here if you need more help.';
      break;

    default:
      reply = 'Something went wrong. Please type "Hi" to restart.';
      session.step = 'start';
      break;
  }

  res.json({
    type: 'message',
    text: reply
  });
});

app.listen(port, () => {
  console.log(`ApnaScheme Webhook running on port ${port}`);
});
