export type ScannerDTO = {
 event:{id:string;title:string;timezone:string};
 member:{memberId:string;displayName:string};
 registration:{id:string;status:'confirmed'};
 checkIn:{id:string;passId:string|null;checkedInAt:string;status:'checked_in'};
};
export type CheckInCode = 'CHECK_IN_SUCCESS'|'ALREADY_CHECKED_IN'|'PASS_INVALID'|'PASS_REVOKED'|'PASS_EXPIRED'|'WRONG_EVENT'|'REGISTRATION_CANCELLED'|'REGISTRATION_NOT_CONFIRMED'|'ACCOUNT_INELIGIBLE'|'CHECK_IN_NOT_OPEN'|'CHECK_IN_CLOSED'|'CHECK_IN_DISABLED'|'CHECK_IN_WINDOW_UNCONFIGURED'|'CHECK_IN_RATE_LIMITED'|'CHECK_IN_NOT_CONFIGURED'|'FORBIDDEN'|'CONFLICT'|'SERVER_ERROR'|'UNAUTHENTICATED'|'EMAIL_NOT_VERIFIED'|'ACCOUNT_SUSPENDED'|'ACCOUNT_DEACTIVATED';
export type ScanResult = {ok:true;code:'CHECK_IN_SUCCESS'|'ALREADY_CHECKED_IN';data:ScannerDTO}|{ok:false;code:CheckInCode;retryAfterSeconds?:number};
export type ScanEffect = {code:CheckInCode;data:ScannerDTO|null;retryAfterSeconds:number};
