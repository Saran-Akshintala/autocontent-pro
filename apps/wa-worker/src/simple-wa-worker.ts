import { Client } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import * as http from 'http';
import * as url from 'url';

console.log('🚀 Starting Simple WhatsApp Worker...');

// Create a simple WhatsApp client without Redis
const client = new Client({
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  },
});

// QR Code event
client.on('qr', qr => {
  console.log('📱 QR Code received, scan with WhatsApp:');
  qrcode.generate(qr, { small: true });
});

// Ready event
client.on('ready', () => {
  console.log('✅ WhatsApp client is ready!');
  const info = client.info;
  console.log(`📱 Connected as: ${info.pushname} (${info.wid.user})`);
});

// Message event
client.on('message', async (message) => {
  console.log(`📩 Received message: ${message.body}`);
  console.log(`📩 Message type: ${message.type}`);
  
  // Handle both button clicks and text commands
  let command = message.body;
  
  // Check if it's a button response or interactive message
  if (message.type === 'buttons_response') {
    // For button responses, try to get the button ID first, then fall back to body
    if (message.selectedButtonId) {
      command = message.selectedButtonId;
      console.log(`🔘 Button clicked with ID: ${command}`);
    } else {
      command = message.body;
      console.log(`🔘 Button clicked with body: ${command}`);
    }
  } else if (message.type === 'interactive') {
    // Handle interactive message responses
    command = message.body;
    console.log(`🔄 Interactive message: ${command}`);
  } else if (message.hasQuotedMsg) {
    // Handle quoted messages
    command = message.body;
    console.log(`💬 Quoted message: ${command}`);
  }
  
  // Log the raw message object for debugging
  console.log(`🔍 Message object keys:`, Object.keys(message));
  console.log(`🔍 Final command to process: "${command}"`)
  
  // Enhanced approval command handling with API integration
  if (command.toLowerCase().startsWith('approve:')) {
    const postId = command.split(':')[1];
    console.log(`🔄 Processing approval for post ${postId}...`);
    
    try {
      // Call the API to approve the post
      const response = await fetch(`${process.env.API_BASE_URL || 'http://localhost:3000/api'}/approvals/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'demo-tenant', // TODO: Make this dynamic
          'Authorization': 'Bearer demo-token' // TODO: Implement proper auth
        },
        body: JSON.stringify({
          postId: postId,
          brandId: 'demo-brand' // TODO: Get from post data
        })
      });
      
      if (response.ok) {
        await message.reply(`✅ **Post Approved Successfully!**\n\n🚀 Post ${postId} has been approved and will be scheduled for publishing.\n\n📊 You can check the status in the Approvals tab.`);
        console.log(`✅ Post ${postId} approved via WhatsApp and API updated`);
      } else {
        throw new Error(`API error: ${response.status}`);
      }
    } catch (error) {
      console.error(`❌ Error approving post ${postId}:`, error.message);
      await message.reply(`❌ **Approval Failed**\n\nSorry, there was an error approving post ${postId}. Please try using the web interface or contact support.\n\nError: ${error.message}`);
    }
    
  } else if (command.toLowerCase().startsWith('reject:')) {
    const postId = command.split(':')[1];
    console.log(`🔄 Processing rejection for post ${postId}...`);
    
    try {
      // Call the API to reject the post
      const response = await fetch(`${process.env.API_BASE_URL || 'http://localhost:3000/api'}/approvals/reject/${postId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'demo-tenant',
          'Authorization': 'Bearer demo-token'
        },
        body: JSON.stringify({
          brandId: 'demo-brand',
          feedback: 'Rejected via WhatsApp'
        })
      });
      
      if (response.ok) {
        await message.reply(`❌ **Post Rejected**\n\n📝 Post ${postId} has been rejected and moved back to drafts.\n\n✏️ The content team can make revisions and resubmit.`);
        console.log(`❌ Post ${postId} rejected via WhatsApp and API updated`);
      } else {
        throw new Error(`API error: ${response.status}`);
      }
    } catch (error) {
      console.error(`❌ Error rejecting post ${postId}:`, error.message);
      await message.reply(`❌ **Rejection Failed**\n\nSorry, there was an error rejecting post ${postId}. Please try using the web interface.\n\nError: ${error.message}`);
    }
    
  } else if (command.toLowerCase().startsWith('change:')) {
    const parts = command.split(':');
    const postId = parts[1];
    const feedback = parts.slice(2).join(':') || 'Please make changes as discussed.';
    console.log(`🔄 Processing change request for post ${postId}...`);
    
    try {
      // Call the API to request changes
      const response = await fetch(`${process.env.API_BASE_URL || 'http://localhost:3000/api'}/approvals/request-change`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'demo-tenant',
          'Authorization': 'Bearer demo-token'
        },
        body: JSON.stringify({
          postId: postId,
          brandId: 'demo-brand',
          feedback: feedback
        })
      });
      
      if (response.ok) {
        await message.reply(`🔄 **Changes Requested**\n\n📝 Post ${postId} needs revisions.\n\n💬 **Feedback:** ${feedback}\n\n✏️ The content team will make the requested changes.`);
        console.log(`🔄 Changes requested for post ${postId} via WhatsApp and API updated`);
      } else {
        throw new Error(`API error: ${response.status}`);
      }
    } catch (error) {
      console.error(`❌ Error requesting changes for post ${postId}:`, error.message);
      await message.reply(`❌ **Change Request Failed**\n\nSorry, there was an error processing the change request for post ${postId}. Please try using the web interface.\n\nError: ${error.message}`);
    }
  }
});

// Disconnected event
client.on('disconnected', reason => {
  console.log('📴 WhatsApp client disconnected:', reason);
});

// Error event
client.on('auth_failure', message => {
  console.error('❌ Authentication failed:', message);
});

// Create HTTP server to receive approval notifications
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  console.log(`🌐 HTTP Request: ${req.method} ${req.url}`);
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method === 'GET' && parsedUrl.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        status: 'ok',
        whatsappReady: !!client.info,
        connectedAs: client.info ? client.info.pushname : null,
      })
    );
    return;
  }

  if (req.method === 'POST' && parsedUrl.pathname === '/notify-approval') {
    console.log(`🔔 Received POST request to /notify-approval`);
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        console.log(`📨 Raw request body: "${body}"`);
        console.log(`📏 Body length: ${body.length}`);

        if (!body || body.trim().length === 0) {
          throw new Error('Empty request body');
        }

        const { postId, title, message } = JSON.parse(body);
        console.log(`📧 Received approval notification for post: ${postId}`);

        // Create approval message
        const approvalMessage =
          `📋 *New Post Requires Approval*\n\n` +
          `📝 Title: ${title}\n` +
          `🆔 Post ID: ${postId}\n\n` +
          `${message || 'Please review and approve this post.'}`;

        if (client.info) {
          try {
            // Try multiple formats for your number
            const numberFormats = [
              '919003090644@c.us', // Standard format
              '+919003090644@c.us', // With + prefix
              '91-9003090644@c.us', // With dash
              client.info.wid._serialized, // Your own WhatsApp ID
            ];

            console.log(`📱 Your WhatsApp ID: ${client.info.wid._serialized}`);
            console.log(`📱 Trying to send to multiple formats...`);

            let messageSent = false;

            for (const numberFormat of numberFormats) {
              try {
                // Try to send interactive buttons first, fallback to text
                try {
                  // Import MessageMedia and Buttons from whatsapp-web.js
                  const { MessageMedia, Buttons } = require('whatsapp-web.js');
                  
                  // Create buttons using the correct whatsapp-web.js format with IDs
                  const button1 = { body: '✅ Approve', id: `approve:${postId}` };
                  const button2 = { body: '❌ Reject', id: `reject:${postId}` };
                  const button3 = { body: '🔄 Request Changes', id: `change:${postId}` };
                  
                  const buttons = new Buttons(
                    `🤖 *AutoContent Pro - Approval Required*\n\n${approvalMessage}\n\n👆 *Use buttons below or reply manually:*`,
                    [button1, button2, button3],
                    'Approval Actions',
                    'AutoContent Pro Approval System'
                  );
                  
                  await client.sendMessage(numberFormat, buttons);
                  console.log(`✅ Interactive buttons sent successfully to +91-9003090644`);
                } catch (buttonError) {
                  console.log(`⚠️ Interactive buttons failed, sending enhanced text fallback: ${buttonError.message}`);
                  // Enhanced fallback with better formatting and emojis
                  const textMessage = `🤖 *AutoContent Pro - Approval Required*\n\n${approvalMessage}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n*📱 QUICK ACTIONS:*\n\n✅ Type: \`approve:${postId}\`\n❌ Type: \`reject:${postId}\`\n🔄 Type: \`change:${postId}:your feedback here\`\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n💡 *Tip: Copy and paste the commands above*\n\n🔗 Or use the web interface at localhost:4200`;
                  
                  await client.sendMessage(numberFormat, textMessage);
                  console.log(`✅ Enhanced text fallback sent successfully to +91-9003090644`);
                }

                messageSent = true;
                break; // Stop after first successful send
              } catch (sendError) {
                console.log(
                  `⚠️ Failed to send to ${numberFormat}: ${sendError.message}`
                );
              }
            }

            if (!messageSent) {
              console.error(`❌ Failed to send message to any format`);
            }
          } catch (error) {
            console.error(
              `❌ Failed to send WhatsApp message: ${error.message}`
            );
            console.log(`🔍 Error details:`, error);
          }
        } else {
          console.log('⚠️ WhatsApp client not ready, notification queued');
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({ success: true, message: 'Notification sent' })
        );
      } catch (error) {
        console.error('❌ Error sending approval notification:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: error.message }));
      }
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

// Start HTTP server
const PORT = parseInt(process.env.WA_WORKER_PORT || '3001');
console.log(`🚀 Attempting to start HTTP server on port ${PORT}...`);

server
  .listen(PORT, () => {
    console.log(`🌐 WhatsApp Worker HTTP server running on port ${PORT}`);
    console.log(
      `📡 Approval notifications endpoint: http://localhost:${PORT}/notify-approval`
    );
  })
  .on('error', (err: any) => {
    console.error(`❌ HTTP server error on port ${PORT}:`, err);
    if (err.code === 'EADDRINUSE') {
      console.error(
        `❌ Port ${PORT} is already in use. Trying port ${PORT + 1}...`
      );
      server
        .listen(PORT + 1, () => {
          console.log(
            `🌐 WhatsApp Worker HTTP server running on port ${PORT + 1}`
          );
          console.log(
            `📡 Approval notifications endpoint: http://localhost:${
              PORT + 1
            }/notify-approval`
          );
        })
        .on('error', (err2: any) => {
          console.error(`❌ HTTP server error on port ${PORT + 1}:`, err2);
        });
    }
  });

// Start the client
console.log('🔄 Initializing WhatsApp client...');
client.initialize().catch(error => {
  console.error('❌ Failed to initialize WhatsApp client:', error);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('🛑 Shutting down WhatsApp Worker...');
  client.destroy();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('🛑 Shutting down WhatsApp Worker...');
  client.destroy();
  process.exit(0);
});
