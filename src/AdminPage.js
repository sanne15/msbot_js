import React, { useEffect, useState } from 'react';
import './AdminPage.css';

function AdminPage() {
  const [botStatus, setBotStatus] = useState(null);
  const [categories, setCategories] = useState([]);
  const [channels, setChannels] = useState({});
  const [messages, setMessages] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedChannel, setSelectedChannel] = useState('');
  const [botInfo, setBotInfo] = useState(null);
  const [sortOrder, setSortOrder] = useState('desc');
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    fetch('/api/bot-status')
      .then(response => response.json())
      .then(data => {
        console.log('Bot status:', data);
        setBotStatus(data);
      })
      .catch(error => console.error('Error fetching bot status:', error));

    fetch('/api/channels')
      .then(response => response.json())
      .then(data => {
        const categoryMap = {};
        data.forEach(channel => {
          const category = channel.parent || 'Uncategorized';
          if (!categoryMap[category]) {
            categoryMap[category] = [];
          }
          categoryMap[category].push(channel);
        });
        setCategories(Object.keys(categoryMap));
        setChannels(categoryMap);
      })
      .catch(error => console.error('Error fetching channels:', error));

    fetch('/api/bot-info')
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        setBotInfo(data);
      })
      .catch(error => console.error('Error fetching bot info:', error));

    const fetchLogs = () => {
      fetch('/api/logs')
        .then(response => response.json())
        .then(data => {
          setLogs(data);
        })
        .catch(error => console.error('Error fetching logs:', error));
    };

    fetchLogs();
    const intervalId = setInterval(fetchLogs, 5000);

    return () => clearInterval(intervalId);
  }, []);

  const handleCategorySelect = (event) => {
    setSelectedCategory(event.target.value);
    setSelectedChannel('');
    setMessages([]);
  };

  const handleChannelSelect = (event) => {
    setSelectedChannel(event.target.value);
    setMessages([]);
  };

  const handleRefreshMessages = () => {
    if (selectedChannel) {
      fetch(`/api/messages/${selectedChannel}`)
        .then(response => response.json())
        .then(data => {
          const sortedMessages = data.sort((a, b) => {
            return sortOrder === 'asc' ? a.timestamp - b.timestamp : b.timestamp - a.timestamp;
          });
          setMessages(sortedMessages);
        })
        .catch(error => console.error('Error fetching messages:', error));
    }
  };

  const toggleSortOrder = () => {
    setSortOrder(prevOrder => (prevOrder === 'asc' ? 'desc' : 'asc'));
  };

  const renderMessageContent = (message) => {
    const emojiRegex = /<:\w+:(\d+)>/g;
    const parts = message.content.split(emojiRegex);
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        const emojiId = part;
        const emojiUrl = `https://cdn.discordapp.com/emojis/${emojiId}.png`;
        return <img key={index} src={emojiUrl} alt="emoji" style={{ width: '20px', verticalAlign: 'middle' }} />;
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className="App-Admin">
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        gap: '20px', 
        padding: '20px',
        minHeight: '100vh',
        height: '100vh'
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'row',
          gap: '20px',
          flexWrap: 'wrap',
          height: '90%'
        }}>
          <div className="admin-panel" style={{
            flex: '1 1 600px',
            minWidth: '300px',
            height: '100%',
            overflowY: 'auto',
            scrollbarWidth: 'thin',
            scrollbarColor: '#7289da #2c2f33',
            '&::-webkit-scrollbar': {
              width: '8px',
              display: 'none'
            },
            '&:hover::-webkit-scrollbar': {
              display: 'block'
            },
            '&::-webkit-scrollbar-track': {
              background: '#2c2f33'
            },
            '&::-webkit-scrollbar-thumb': {
              background: '#7289da',
              borderRadius: '4px'
            }
          }}>
            <h1 style={{ position: 'sticky', top: 0, backgroundColor: '#2c2f33', padding: '10px 0', zIndex: 100 }}>Discord Admin Panel</h1>
            <div className="status-box">
              <h2>Status</h2>
              <p>{botStatus ? botStatus : 'Loading...'}</p>
            </div>
            <div className="info-box">
              <h2>Bot Information</h2>
              {botInfo ? (
                <>
                  <p>Client ID: {botInfo.clientId}</p>
                  <p className="guild-name">
                    Guild Name: {botInfo.guildName || 'Loading...'}
                    <span className="guild-id-overlay">{botInfo.guildId}</span>
                  </p>
                </>
              ) : (
                <p>Loading...</p>
              )}
            </div>
            <div className="channel-box">
              <h2>Accessible Channels</h2>
              <select value={selectedCategory} onChange={handleCategorySelect} className="select-menu">
                <option value="">Select a category</option>
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              {selectedCategory && channels[selectedCategory] && (
                <select value={selectedChannel} onChange={handleChannelSelect} className="select-menu">
                  <option value="">Select a channel</option>
                  {channels[selectedCategory].map(channel => (
                    <option key={channel.id} value={channel.id}>
                      {channel.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
            {selectedChannel && (
              <div className="message-box" style={{ 
                maxHeight: '500px', 
                overflowY: 'auto',
                scrollbarWidth: 'thin',
                scrollbarColor: '#7289da #2c2f33',
                '&::-webkit-scrollbar': {
                  width: '8px',
                  display: 'none'
                },
                '&:hover::-webkit-scrollbar': {
                  display: 'block'
                },
                '&::-webkit-scrollbar-track': {
                  background: '#2c2f33'
                },
                '&::-webkit-scrollbar-thumb': {
                  background: '#7289da',
                  borderRadius: '4px'
                }
              }}>
                <h2>Recent Messages</h2>
                <button onClick={handleRefreshMessages} className="refresh-button">
                  Refresh Messages
                </button>
                <button onClick={toggleSortOrder} className="sort-button">
                  Sort: {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                </button>
                <ul>
                  {messages.map(message => (
                    <li key={message.id} className="message-item">
                      <strong>{message.author}:</strong> {renderMessageContent(message)}
                      {message.imageUrl && <img src={message.imageUrl} alt="attachment" style={{ maxWidth: '100px', display: 'block', marginTop: '5px' }} />}
                      <div className="message-overlay">{new Date(message.timestamp).toLocaleString()}</div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="terminal-panel" style={{ 
            flex: '1 1 300px',
            backgroundColor: '#1e1e1e',
            color: '#ffffff',
            padding: '20px',
            borderRadius: '10px',
            fontFamily: 'IBM Plex Mono, monospace',
            height: '100%',
            overflowY: 'auto',
            scrollbarWidth: 'thin',
            scrollbarColor: '#7289da #1e1e1e',
            '&::-webkit-scrollbar': {
              width: '8px',
              display: 'none'
            },
            '&:hover::-webkit-scrollbar': {
              display: 'block'
            },
            '&::-webkit-scrollbar-track': {
              background: '#1e1e1e'
            },
            '&::-webkit-scrollbar-thumb': {
              background: '#7289da',
              borderRadius: '4px'
            }
          }}>
            <h2 style={{ 
              color: '#7289da', 
              marginTop: 0,
              position: 'sticky',
              top: 0,
              backgroundColor: '#1e1e1e',
              padding: '10px 0',
              zIndex: 1
            }}>Terminal Log</h2>
            <div style={{ whiteSpace: 'pre-wrap' }}>
              {logs.map((log, index) => (
                <div key={index} style={{ marginBottom: '8px' }}>
                  {'>'} {log.message}
                  <span style={{ color: '#666', fontSize: '0.8em', marginLeft: '8px' }}>
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminPage;