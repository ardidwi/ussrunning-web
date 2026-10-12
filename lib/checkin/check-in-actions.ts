"use server";
import {checkInEventPass} from './check-in-service';
export async function scanEventPass(value:unknown){return checkInEventPass(value);}
