const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');
const app = express();
const db = new Database('campus-crave.sqlite');
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Demo-only role selection. Replace with verified accounts + password hashing before deployment.
db.exec(`
CREATE TABLE IF NOT EXISTS menu(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,category TEXT NOT NULL,price INTEGER NOT NULL,emoji TEXT DEFAULT '🍽️',stock INTEGER DEFAULT 20,prep INTEGER DEFAULT 10,active INTEGER DEFAULT 1);
CREATE TABLE IF NOT EXISTS orders(id INTEGER PRIMARY KEY AUTOINCREMENT,order_no TEXT UNIQUE NOT NULL,student_name TEXT NOT NULL,student_id TEXT NOT NULL,pickup_slot TEXT NOT NULL,payment_method TEXT NOT NULL,payment_status TEXT NOT NULL,total INTEGER NOT NULL,status TEXT NOT NULL DEFAULT 'Received',created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS order_items(id INTEGER PRIMARY KEY AUTOINCREMENT,order_id INTEGER NOT NULL,menu_id INTEGER NOT NULL,name TEXT NOT NULL,price INTEGER NOT NULL,qty INTEGER NOT NULL,FOREIGN KEY(order_id) REFERENCES orders(id));
`);
const count = db.prepare('SELECT COUNT(*) n FROM menu').get().n;
if (!count) {
 const seed = db.prepare('INSERT INTO menu(name,category,price,emoji,stock,prep) VALUES(?,?,?,?,?,?)');
 [
 ['Veg Sandwich','Snacks',40,'🥪',30,8],['Samosa','Snacks',15,'🥟',40,5],['French Fries','Snacks',50,'🍟',25,10],['Veg Burger','Quick Bites',60,'🍔',20,12],['Masala Maggi','Quick Bites',45,'🍜',25,10],['Mini Pizza','Pizza',80,'🍕',15,15],['Cold Coffee','Drinks',50,'🧋',25,5],['Lemon Soda','Drinks',25,'🥤',30,3]
 ].forEach(x=>seed.run(...x));
}
const getMenu = db.prepare('SELECT * FROM menu WHERE active=1 ORDER BY category,name');
app.get('/api/menu', (req,res)=>res.json(getMenu.all()));
app.get('/api/orders', (req,res)=>{
 const rows=db.prepare('SELECT * FROM orders ORDER BY id DESC').all();
 const items=db.prepare('SELECT name,price,qty FROM order_items WHERE order_id=?');
 res.json(rows.map(o=>({...o,items:items.all(o.id)})));
});
app.post('/api/orders', (req,res)=>{
 const {name,studentId,slot,payment,items}=req.body;
 if(!name||!studentId||!slot||!Array.isArray(items)||!items.length) return res.status(400).json({error:'Please complete all required fields.'});
 const create=db.transaction(()=>{
  let total=0,validated=[];
  for(const line of items){
   const p=db.prepare('SELECT * FROM menu WHERE id=? AND active=1').get(Number(line.id));
   const qty=Math.max(0,Math.floor(Number(line.qty)));
   if(!p||!qty||p.stock<qty) throw new Error(`${p?.name||'An item'} is unavailable or has insufficient stock.`);
   total+=p.price*qty; validated.push({p,qty});
  }
  const orderNo='CC'+Date.now().toString().slice(-7)+crypto.randomInt(10,99);
  const paymentStatus=payment==='Test UPI/Card'?'TEST PAYMENT (SIMULATED)':'Pay at counter';
  const info=db.prepare(`INSERT INTO orders(order_no,student_name,student_id,pickup_slot,payment_method,payment_status,total,status,created_at) VALUES(?,?,?,?,?,?,?,'Received',?)`).run(orderNo,name,studentId,slot,payment,paymentStatus,total,new Date().toISOString());
  const addItem=db.prepare('INSERT INTO order_items(order_id,menu_id,name,price,qty) VALUES(?,?,?,?,?)');
  const reduce=db.prepare('UPDATE menu SET stock=stock-? WHERE id=?');
  validated.forEach(({p,qty})=>{addItem.run(info.lastInsertRowid,p.id,p.name,p.price,qty);reduce.run(qty,p.id)});
  return {orderNo,total,paymentStatus};
 });
 try {res.json(create());} catch(e){res.status(400).json({error:e.message});}
});
app.patch('/api/orders/:id/status',(req,res)=>{
 const allowed=['Received','Accepted','Preparing','Ready for Pickup','Collected','Cancelled'];
 if(!allowed.includes(req.body.status)) return res.status(400).json({error:'Invalid status'});
 const order=db.prepare('SELECT * FROM orders WHERE id=?').get(req.params.id);
 if(!order) return res.status(404).json({error:'Order not found'});
 if(order.status==='Collected') return res.status(400).json({error:'Collected orders cannot be changed.'});
 db.prepare('UPDATE orders SET status=? WHERE id=?').run(req.body.status,req.params.id);
 res.json({ok:true});
});
app.post('/api/menu',(req,res)=>{
 const {name,category,price,emoji,stock,prep}=req.body;
 if(!name||!category||Number(price)<1) return res.status(400).json({error:'Enter valid item details.'});
 const info=db.prepare('INSERT INTO menu(name,category,price,emoji,stock,prep) VALUES(?,?,?,?,?,?)').run(name,category,Number(price),emoji||'🍽️',Number(stock)||0,Number(prep)||10);
 res.json({id:info.lastInsertRowid});
});
app.patch('/api/menu/:id',(req,res)=>{
 const {price,stock,active}=req.body;
 db.prepare('UPDATE menu SET price=COALESCE(?,price),stock=COALESCE(?,stock),active=COALESCE(?,active) WHERE id=?').run(price??null,stock??null,active??null,req.params.id);
 res.json({ok:true});
});
app.delete('/api/menu/:id',(req,res)=>{db.prepare('UPDATE menu SET active=0 WHERE id=?').run(req.params.id);res.json({ok:true});});
app.get('/api/summary',(req,res)=>{
 const today=new Date().toISOString().slice(0,10);
 const stats=db.prepare("SELECT COUNT(*) orders,COALESCE(SUM(total),0) sales FROM orders WHERE substr(created_at,1,10)=?").get(today);
 const statuses=db.prepare('SELECT status,COUNT(*) count FROM orders GROUP BY status').all();
 res.json({ ...stats,statuses });
});
const PORT=process.env.PORT||3000;
app.listen(PORT,()=>console.log(`Campus Crave running at http://localhost:${PORT}`));
