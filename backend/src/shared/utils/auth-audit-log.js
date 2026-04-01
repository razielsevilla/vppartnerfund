const failedLoginEvents = [];

const logFailedLoginEvent = ({ email, ip, reason }) => {
  const event = {
    type: "auth.failed_login",
    email,
    ip,
    reason,
    timestamp: new Date().toISOString(),
  };

  failedLoginEvents.push(event);

  // Keep memory bounded for local runtime usage.
  if (failedLoginEvents.length > 500) {
    failedLoginEvents.shift();
  }

  // eslint-disable-next-line no-console
  console.warn(JSON.stringify(event));

  return event;
};

module.exports = {
  failedLoginEvents,
  logFailedLoginEvent,
};
