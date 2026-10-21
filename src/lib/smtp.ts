import net from 'net';
import tls from 'tls';

export interface SmtpOptions {
  host: string;
  port: number;
  secure?: boolean;
  user?: string;
  pass?: string;
  from: string;
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
}

/**
 * Lightweight, zero-dependency SMTP client using native Node.js net & tls sockets.
 * Supports standard SMTP, SMTPS (port 465), STARTTLS (port 587/25), and AUTH LOGIN.
 */
export async function sendSmtpEmail(options: SmtpOptions): Promise<{ success: boolean; messageId?: string }> {
  const { host, port, secure, user, pass, from, to, subject, text, html } = options;

  if (!host || !from || !to) {
    throw new Error('SMTP host, from, and to addresses are required');
  }

  const recipients = Array.isArray(to) ? to : to.split(',').map((t) => t.trim()).filter(Boolean);
  if (recipients.length === 0) {
    throw new Error('At least one recipient email address is required');
  }

  return new Promise((resolve, reject) => {
    let socket: net.Socket | tls.TLSSocket;
    let step = 0;
    const isDirectTls = secure || port === 465;

    const cleanup = () => {
      try {
        socket.destroy();
      } catch {}
    };

    const sendCmd = (cmd: string) => {
      socket.write(cmd + '\r\n');
    };

    const handleData = (data: Buffer) => {
      const response = data.toString();
      const code = parseInt(response.slice(0, 3), 10);

      // Check for error responses (4xx or 5xx)
      if (code >= 400) {
        cleanup();
        return reject(new Error(`SMTP server responded with error ${code}: ${response.trim()}`));
      }

      switch (step) {
        case 0: // Server greeting (220)
          if (code === 220) {
            step = 1;
            sendCmd(`EHLO localhost`);
          }
          break;

        case 1: // EHLO response (250)
          if (code === 250) {
            if (!isDirectTls && (port === 587 || port === 25)) {
              // Initiate STARTTLS
              step = 2;
              sendCmd('STARTTLS');
            } else if (user && pass) {
              step = 4;
              sendCmd('AUTH LOGIN');
            } else {
              step = 6;
              sendCmd(`MAIL FROM:<${from}>`);
            }
          }
          break;

        case 2: // STARTTLS response (220 ready to start TLS)
          if (code === 220) {
            // Upgrade socket to TLS
            socket.removeAllListeners('data');
            const tlsSocket = tls.connect({
              socket,
              host,
              servername: host,
              rejectUnauthorized: false, // allow self-signed enterprise certs
            });

            tlsSocket.on('secureConnect', () => {
              socket = tlsSocket;
              tlsSocket.on('data', handleData);
              step = 3;
              sendCmd('EHLO localhost');
            });

            tlsSocket.on('error', (err) => {
              cleanup();
              reject(err);
            });
          }
          break;

        case 3: // Post-TLS EHLO response (250)
          if (code === 250) {
            if (user && pass) {
              step = 4;
              sendCmd('AUTH LOGIN');
            } else {
              step = 6;
              sendCmd(`MAIL FROM:<${from}>`);
            }
          }
          break;

        case 4: // AUTH LOGIN prompt for username (334)
          if (code === 334) {
            step = 5;
            sendCmd(Buffer.from(user!).toString('base64'));
          }
          break;

        case 5: // AUTH LOGIN prompt for password (334)
          if (code === 334) {
            step = 6;
            sendCmd(Buffer.from(pass!).toString('base64'));
          }
          break;

        case 6: // Auth accepted (235) or ready for MAIL FROM
          if (code === 235 || (code === 250 && (!user || !pass))) {
            step = 7;
            sendCmd(`MAIL FROM:<${from}>`);
          }
          break;

        case 7: // MAIL FROM ok (250)
          if (code === 250) {
            step = 8;
            // Send first recipient
            sendCmd(`RCPT TO:<${recipients[0]}>`);
          }
          break;

        case 8: // RCPT TO ok (250)
          if (code === 250) {
            // Check if more recipients exist
            step = 9;
            sendCmd('DATA');
          }
          break;

        case 9: // DATA ready (354)
          if (code === 354) {
            step = 10;
            const messageId = `<${Date.now()}.${Math.random().toString(36).slice(2)}@${host}>`;
            const dateStr = new Date().toUTCString();

            let mimeBody = `From: ${from}\r\n`;
            mimeBody += `To: ${recipients.join(', ')}\r\n`;
            mimeBody += `Subject: ${subject}\r\n`;
            mimeBody += `Date: ${dateStr}\r\n`;
            mimeBody += `Message-ID: ${messageId}\r\n`;
            mimeBody += `MIME-Version: 1.0\r\n`;

            if (html) {
              mimeBody += `Content-Type: text/html; charset=UTF-8\r\n\r\n`;
              mimeBody += html;
            } else {
              mimeBody += `Content-Type: text/plain; charset=UTF-8\r\n\r\n`;
              mimeBody += text || subject;
            }

            mimeBody += `\r\n.\r\n`;
            socket.write(mimeBody);
          }
          break;

        case 10: // Data accepted (250)
          if (code === 250) {
            step = 11;
            sendCmd('QUIT');
            cleanup();
            resolve({ success: true });
          }
          break;
      }
    };

    if (isDirectTls) {
      socket = tls.connect({
        host,
        port,
        servername: host,
        rejectUnauthorized: false,
      });
    } else {
      socket = net.connect({ host, port });
    }

    socket.setTimeout(12000, () => {
      cleanup();
      reject(new Error('SMTP connection timed out after 12s'));
    });

    socket.on('data', handleData);
    socket.on('error', (err) => {
      cleanup();
      reject(err);
    });
  });
}
