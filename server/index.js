require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const mercadopago = require('mercadopago');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 4000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5500';

app.use(cors({origin: true, credentials: true}));
app.use(bodyParser.json());

// In-memory stores (demo only)
const users = [];
const purchases = [];

function authMiddleware(req,res,next){
  const auth = req.headers.authorization;
  if(!auth) return res.status(401).json({error:'No token'});
  const parts = auth.split(' ');
  if(parts.length!==2) return res.status(401).json({error:'Token malformed'});
  const token = parts[1];
  try{
    const data = jwt.verify(token, process.env.JWT_SECRET || 'devsecret');
    req.user = data;
    next();
  }catch(e){
    return res.status(401).json({error:'Invalid token'});
  }
}

// Auth routes
app.post('/api/auth/register', async (req,res)=>{
  const {email,password,name} = req.body;
  if(!email || !password) return res.status(400).json({error:'Missing fields'});
  if(users.find(u=>u.email===email)) return res.status(400).json({error:'User exists'});
  const hashed = await bcrypt.hash(password,10);
  const user = {id: String(users.length+1), email, name: name||'', password: hashed};
  users.push(user);
  const token = jwt.sign({id:user.id,email:user.email}, process.env.JWT_SECRET || 'devsecret',{expiresIn:'7d'});
  res.json({token, user:{id:user.id,email:user.email,name:user.name}});
});

app.post('/api/auth/login', async (req,res)=>{
  const {email,password} = req.body;
  const user = users.find(u=>u.email===email);
  if(!user) return res.status(400).json({error:'Invalid credentials'});
  const ok = await bcrypt.compare(password,user.password);
  if(!ok) return res.status(400).json({error:'Invalid credentials'});
  const token = jwt.sign({id:user.id,email:user.email}, process.env.JWT_SECRET || 'devsecret',{expiresIn:'7d'});
  res.json({token, user:{id:user.id,email:user.email,name:user.name}});
});

app.get('/api/auth/profile', authMiddleware, (req,res)=>{
  const user = users.find(u=>u.id===req.user.id);
  if(!user) return res.status(404).json({error:'No user'});
  res.json({id:user.id,email:user.email,name:user.name});
});

// Purchases
app.post('/api/purchases/mark', authMiddleware, (req,res)=>{
  const {course, provider, provider_id} = req.body;
  purchases.push({userId:req.user.id, course, provider, provider_id, at: new Date().toISOString()});
  res.json({ok:true});
});

// PayPal helpers
async function getPayPalAccessToken(){
  const client = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  const auth = Buffer.from(client+':'+secret).toString('base64');
  const res = await fetch('https://api-m.sandbox.paypal.com/v1/oauth2/token',{
    method:'POST',
    headers:{Authorization:'Basic '+auth, 'Content-Type':'application/x-www-form-urlencoded'},
    body:'grant_type=client_credentials'
  });
  const data = await res.json();
  return data.access_token;
}

app.post('/api/paypal/create-order', authMiddleware, async (req,res)=>{
  try{
    const {course} = req.body;
    const accessToken = await getPayPalAccessToken();
    const body = {
      intent: 'CAPTURE',
      purchase_units: [{amount:{currency_code:'USD',value:'19.99'}, description: course}],
      application_context: {
        brand_name: 'Manual del Junior',
        landing_page: 'NO_PREFERENCE',
        user_action: 'PAY_NOW',
        return_url: `${CLIENT_URL}/paypal-success.html`,
        cancel_url: `${CLIENT_URL}/` 
      }
    };
    const r = await fetch('https://api-m.sandbox.paypal.com/v2/checkout/orders',{method:'POST',headers:{
      'Content-Type':'application/json',
      Authorization: 'Bearer '+accessToken
    },body:JSON.stringify(body)});
    const data = await r.json();
    const approve = (data.links||[]).find(l=>l.rel==='approve');
    res.json({order:data, approveUrl: approve ? approve.href : null});
  }catch(e){
    console.error(e);
    res.status(500).json({error:'paypal error'});
  }
});

app.post('/api/paypal/capture', authMiddleware, async (req,res)=>{
  try{
    const {orderID, course} = req.body;
    const accessToken = await getPayPalAccessToken();
    const r = await fetch(`https://api-m.sandbox.paypal.com/v2/checkout/orders/${orderID}/capture`,{method:'POST',headers:{
      'Content-Type':'application/json',
      Authorization: 'Bearer '+accessToken
    }});
    const data = await r.json();
    // mark purchase
    purchases.push({userId:req.user.id, course, provider:'paypal', provider_id: orderID, at: new Date().toISOString()});
    res.json({capture:data});
  }catch(e){
    console.error(e);
    res.status(500).json({error:'capture error'});
  }
});

// MercadoPago
if(process.env.MP_ACCESS_TOKEN){
  mercadopago.configure({access_token: process.env.MP_ACCESS_TOKEN});
}

app.post('/api/mercadopago/create-preference', authMiddleware, async (req,res)=>{
  try{
    const {course} = req.body;
    mercadopago.configure({access_token:process.env.MP_ACCESS_TOKEN});
    const preference = {
      items: [{title: course, quantity:1, unit_price: 19.99}],
      payer: {email: req.user.email},
      external_reference: `${req.user.id}_${course}`,
      back_urls: {success: `${CLIENT_URL}/mp-success.html`, failure: `${CLIENT_URL}/`, pending: `${CLIENT_URL}/`},
      auto_return: 'approved'
    };
    const response = await mercadopago.preferences.create(preference);
    res.json({preference: response.body});
  }catch(e){
    console.error(e);
    res.status(500).json({error:'mercadopago error'});
  }
});

// Simple route to see purchases for demo (not protected deeply)
app.get('/api/purchases', authMiddleware, (req,res)=>{
  const mine = purchases.filter(p=>p.userId===req.user.id);
  res.json({purchases:mine});
});

app.listen(PORT, ()=>{
  console.log('Server listening on',PORT);
});
