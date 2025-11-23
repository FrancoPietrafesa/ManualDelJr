const mercadopago = require('mercadopago');

mercadopago.configure({access_token: process.env.MP_ACCESS_TOKEN || ''});

module.exports = async (req,res)=>{
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'});
  try{
    const { course, payer_email } = req.body;
    const preference = {
      items:[{title: course || 'Course', quantity:1, unit_price: 19.99}],
      payer: { email: payer_email || '' },
      back_urls: { success: `${process.env.CLIENT_URL || ''}/mp-success.html`, failure: `${process.env.CLIENT_URL || ''}/`, pending: `${process.env.CLIENT_URL || ''}/` },
      auto_return: 'approved'
    };
    const response = await mercadopago.preferences.create(preference);
    res.json({preference: response.body});
  }catch(err){console.error(err);res.status(500).json({error:'mercadopago error'});}  
};
