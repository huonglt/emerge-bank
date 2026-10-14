import { UserSessionData } from '../types'

// simple map to manage session on server
export const sessions = new Map<string, UserSessionData>()
