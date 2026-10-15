/**
 * The two users every server test runs with
 * vitest-setup.ts creates them in the users DB; tests log in with these credentials
 */
export const testUser1 = {
  id: '1',
  userName: 'testUser1',
  password: 'password1',
  cardName: null, // the card still needs setting up
}

export const testUser2 = {
  id: '2',
  userName: 'testUser2',
  password: 'password2',
  cardName: 'Everyday',
}
