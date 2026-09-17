import type{IncomingMessage,ServerResponse}from'node:http';
import{decideLive,setRuntimeKey}from'../server/typesafe.js';
import{readKey}from'./key.js';
export default async function handler(req:IncomingMessage&{body?:any},res:ServerResponse){res.setHeader('content-type','application/json');if(req.method!=='POST'){res.statusCode=405;return res.end('{"error":"Method not allowed"}')}try{const key=readKey(req);if(!key)throw new Error('KEY_REQUIRED');setRuntimeKey(key);res.end(JSON.stringify(await decideLive(req.body?.state,req.body?.prompt)))}catch(error){res.statusCode=502;res.end(JSON.stringify({error:error instanceof Error?error.message:'Decision service unavailable'}))}}
