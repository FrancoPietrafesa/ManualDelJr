const fs = require('fs').promises;
const path = require('path');
const jwt = require('jsonwebtoken');

const DB_USERS = path.join(__dirname,'..','data','users.json');

async function readUsers(){
  try{ const raw = await fs.readFile(DB_USERS,'utf8'); return JSON.parse(raw); }catch(e){ return []; }
}

function authFromHeader(req){
  const h = req.headers.authorization; if(!h) return null; const parts = h.split(' '); if(parts.length!==2) return null; return parts[1];
}

module.exports = async (req,res)=>{
  if(req.method!=='GET') return res.status(405).json({error:'Method not allowed'});
  try{
    const token = authFromHeader(req);
    if(!token) return res.status(401).json({error:'No token'});
    let data;
    try{ data = jwt.verify(token, process.env.JWT_SECRET || 'devsecret'); }catch(e){ return res.status(401).json({error:'Invalid token'}); }
    const users = await readUsers();
    const user = users.find(u=>u.id===data.id);
    if(!user) return res.status(404).json({error:'No user'});
    res.json({id:user.id,email:user.email,name:user.name});
  }catch(err){console.error(err);res.status(500).json({error:'server error'});}  
};
