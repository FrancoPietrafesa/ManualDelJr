const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');

function authFromHeader(req){
  const h = req.headers.authorization; if(!h) return null; const parts = h.split(' '); if(parts.length!==2) return null; return parts[1];
}

async function getPayPalAccessToken(){
  const client = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  const auth = Buffer.from(client+':'+secret).toString('base64');
  const r = await fetch('https://api-m.sandbox.paypal.com/v1/oauth2/token',{method:'POST',headers:{Authorization:'Basic '+auth,'Content-Type':'application/x-www-form-urlencoded'},body:'grant_type=client_credentials'});
  return r.json();
}

module.exports = async (req,res)=>{
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'});
  const token = authFromHeader(req);
  if(!token) return res.status(401).json({error:'No token'});
  try{
    jwt.verify(token, process.env.JWT_SECRET || 'devsecret');
    const { orderID, course } = req.body;
    const atkObj = await getPayPalAccessToken();
    const accessToken = atkObj.access_token;
    const r = await fetch(`https://api-m.sandbox.paypal.com/v2/checkout/orders/${orderID}/capture`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+accessToken}});
    const data = await r.json();
    // NOTE: in serverless demo we don't persist purchases here. In production, record purchase in DB.
    res.json({capture:data});
  }catch(err){console.error(err);res.status(500).json({error:'capture error'});}  
};
