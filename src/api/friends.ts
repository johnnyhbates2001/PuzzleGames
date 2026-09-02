import { apiDelete, apiGet, apiPost } from './client'
import type { User } from './types'

export interface FriendsResponse {
  friends: User[]
  incoming: User[]
  outgoing: User[]
}

export function fetchFriends(): Promise<FriendsResponse> {
  return apiGet<FriendsResponse>('/friends')
}

export function sendFriendRequest(username: string): Promise<{ status: string }> {
  return apiPost('/friends/request', { username })
}

export function respondToFriendRequest(username: string, accept: boolean): Promise<{ ok: boolean }> {
  return apiPost('/friends/respond', { username, accept })
}

export function removeFriend(username: string): Promise<{ ok: boolean }> {
  return apiDelete(`/friends/${encodeURIComponent(username)}`)
}
