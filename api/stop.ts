import type{IncomingMessage,ServerResponse}from'node:http';
import{stopLiveRequests}from'../server/typesafe.js';
export default function handler(req:IncomingMessage,res:ServerResponse){res.setHeader('content-type','application/json');if(req.method!=='POST'){res.statusCode=405;return res.end('{"error":"Method not allowed"}')}stopLiveRequests();res.end('{"ok":true}')}
