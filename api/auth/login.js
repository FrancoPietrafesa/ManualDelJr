const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const DB_USERS = path.join(__dirname,'..','data','users.json');

async function readUsers(){
  try{ const raw = await fs.readFile(DB_USERS,'utf8'); return JSON.parse(raw); }catch(e){ return []; }
}

module.exports = async (req,res)=>{
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'});
  try{
    const {email,password} = req.body;
    if(!email||!password) return res.status(400).json({error:'Missing fields'});
    const users = await readUsers();
    const user = users.find(u=>u.email===email);
    if(!user) return res.status(400).json({error:'Invalid credentials'});
    const ok = await bcrypt.compare(password,user.password);
    if(!ok) return res.status(400).json({error:'Invalid credentials'});
    const token = jwt.sign({id:user.id,email:user.email}, process.env.JWT_SECRET || 'devsecret',{expiresIn:'7d'});
    res.json({token,user:{id:user.id,email:user.email,name:user.name}});
  }catch(err){
    console.error(err);res.status(500).json({error:'server error'});
  }
};
