export async function signOutRoute({ auth }) {
  if (!auth?.userId) {
    return { status: 401, data: { signedOut: false } };
  }
  return {
    data: { signedOut: true },
    headers: { "Clear-Site-Data": '"cache", "cookies", "storage"' }
  };
}
