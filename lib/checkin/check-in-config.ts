import 'server-only';
export class CheckInConfigError extends Error {}
export function scanLimitConfig(){
 const read=(name:string,fallback:number,max:number)=>{
  const raw=process.env[name];const n=raw===undefined?fallback:Number(raw);
  if(!Number.isInteger(n)||n<1||n>max)throw new CheckInConfigError('CHECK_IN_NOT_CONFIGURED');return n;
 };
 return {max:read('CHECK_IN_RATE_LIMIT_MAX_REQUESTS',120,10000),seconds:read('CHECK_IN_RATE_LIMIT_WINDOW_SECONDS',60,3600)};
}
