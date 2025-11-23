const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const DB_USERS = path.join(__dirname,'..','data','users.json');

async function readUsers(){
  try{
    const raw = await fs.readFile(DB_USERS,'utf8');
    return JSON.parse(raw);
  }catch(e){
    return [];
  }
}

async function writeUsers(users){
  await fs.mkdir(path.join(__dirname,'..','data'),{recursive:true});
  await fs.writeFile(DB_USERS, JSON.stringify(users,null,2),'utf8');
}

module.exports = async (req, res) => {
  if(req.method !== 'POST') return res.status(405).json({error:'Method not allowed'});
  try{
    const { email, password, name } = req.body;
    if(!email || !password) return res.status(400).json({error:'Missing fields'});
    const users = await readUsers();
    if(users.find(u=>u.email===email)) return res.status(400).json({error:'User exists'});
    const hashed = await bcrypt.hash(password, 10);
    const user = { id: String(users.length+1), email, name: name||'', password: hashed };
    users.push(user);
    await writeUsers(users);
    const token = jwt.sign({id:user.id,email:user.email}, process.env.JWT_SECRET || 'devsecret',{expiresIn:'7d'});
    res.json({token, user:{id:user.id,email:user.email,name:user.name}});
  }catch(err){
    console.error(err);
    res.status(500).json({error:'server error'});
  }
};
