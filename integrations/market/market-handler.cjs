"use strict";
// GET-only authenticated market quote handler; app supplies auth+ensureMember.
const {symbol}=require("./alpha-vantage.cjs");
const {createSourceAwareQuotes}=require("./alpaca-iex.cjs");
function createMarketHandler({quotes=createSourceAwareQuotes()}={}){
 return async function marketHandler(req,res){
  res.set("Cache-Control","no-store");
  res.set("X-Content-Type-Options","nosniff");
  if(req.method!=="GET")return res.status(405).json({error:"Method not allowed"});
  if(!quotes.configured())return res.status(503).json({status:"NOT_CONNECTED",message:"No licensed market quote provider configured."});
  try{
   const ticker=symbol(req.query?.symbol);
   const result=await quotes.quote(ticker);
   return res.json({status:"PROVIDER_DATA",quote:result});
  }catch(err){
   const invalid=/Invalid ticker/.test(err.message);
   return res.status(invalid?400:502).json({status:invalid?"INVALID_REQUEST":"UPSTREAM_UNAVAILABLE",message:invalid?"Invalid ticker symbol.":"Market quote unavailable; no synthetic fallback."});
  }
 };
}
module.exports={createMarketHandler};
