function stringifySafe(value) {
  try {
    return JSON.stringify(value);
  } catch {
    return JSON.stringify({ message: "Unserializable log payload" });
  }
}

function emit(level, event, meta = {}) {
  const line = {
    level,
    event,
    timestamp: new Date().toISOString(),
    ...meta,
  };

  if (level === "error") {
    // eslint-disable-next-line no-console
    console.error(stringifySafe(line));
    return;
  }

  // eslint-disable-next-line no-console
  console.log(stringifySafe(line));
}

function info(event, meta) {
  emit("info", event, meta);
}

function warn(event, meta) {
  emit("warn", event, meta);
}

function error(event, meta) {
  emit("error", event, meta);
}

module.exports = {
  info,
  warn,
  error,
};
