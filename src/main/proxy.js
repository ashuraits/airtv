const net = require('net');
const { session } = require('electron');

const PROBE_TIMEOUT_MS = 5000;

function test(host, port) {
  return new Promise((resolve, reject) => {
    const portNum = parseInt(port, 10);
    if (!host || !portNum || isNaN(portNum) || portNum < 1 || portNum > 65535) {
      return reject(new Error('Invalid host or port'));
    }

    const socket = net.createConnection({ host, port: portNum });

    socket.setTimeout(PROBE_TIMEOUT_MS);

    socket.on('connect', () => {
      socket.destroy();
      resolve();
    });

    socket.on('timeout', () => {
      socket.destroy();
      reject(new Error('Connection timed out'));
    });

    socket.on('error', (err) => {
      if (err.code === 'ECONNREFUSED') reject(new Error('Connection refused'));
      else if (err.code === 'ENOTFOUND') reject(new Error('Host not found'));
      else reject(err);
    });
  });
}

function apply(store) {
  const enabled = store.get('proxyEnabled', false);
  const protocol = store.get('proxyProtocol', 'http');
  const host = store.get('proxyHost', '');
  const port = store.get('proxyPort', '');
  if (enabled && host && port) {
    session.defaultSession.setProxy({ proxyRules: `${protocol}://${host}:${port}` });
  } else {
    session.defaultSession.setProxy({ proxyRules: 'direct://' });
  }
}

module.exports = { test, apply };
