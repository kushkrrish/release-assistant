function startEventStream(res) {
  res.status(200);
  res.set({
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no'
  });
  res.flushHeaders();
}

function sendEvent(res, event, data) {
  if (res.writableEnded || res.destroyed) return;

  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

function endEventStream(res) {
  if (!res.writableEnded && !res.destroyed) res.end();
}

module.exports = {
  startEventStream,
  sendEvent,
  endEventStream
};
