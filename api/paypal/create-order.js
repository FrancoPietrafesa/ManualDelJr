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
    // verify user token (not strictly needed, but demo)
    jwt.verify(token, process.env.JWT_SECRET || 'devsecret');
    const { course } = req.body;
    const atkObj = await getPayPalAccessToken();
    const accessToken = atkObj.access_token;
    const body = {
      intent:'CAPTURE',
      purchase_units:[{amount:{currency_code:'USD',value:'19.99'}, description: course || 'Course'}],
      application_context:{brand_name:'Manual del Junior',landing_page:'NO_PREFERENCE',user_action:'PAY_NOW',return_url: `${process.env.CLIENT_URL || ''}/paypal-success.html`, cancel_url: `${process.env.CLIENT_URL || ''}/`}
    };
    const r = await fetch('https://api-m.sandbox.paypal.com/v2/checkout/orders',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+accessToken},body:JSON.stringify(body)});
    const data = await r.json();
    const approve = (data.links||[]).find(l=>l.rel==='approve');
    res.json({order:data, approveUrl: approve? approve.href : null});
  }catch(err){console.error(err);res.status(500).json({error:'paypal error'});}  
};
