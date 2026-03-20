// src/notifications.js
// Expo Push API sender

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export async function sendPushNotification(expoPushToken, { title, body, data = {} }) {
  const message = {
    to: expoPushToken,
    sound: 'default',
    title,
    body,
    data,
  };

  const res = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message),
  });

  return res.json();
}

export async function sendPushToMany(tokens, notification) {
  const messages = tokens.map(token => ({
    to: token,
    sound: 'default',
    ...notification,
  }));

  const res = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(messages),
  });

  return res.json();
}
