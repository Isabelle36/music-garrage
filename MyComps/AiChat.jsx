import { NebiusChat } from 'nebius-chat';

const AiChat = () => {
  return (
    <div className="mt-4">
      <h3 className="text-lg font-semibold">🎹 AI Chat</h3>
      <NebiusChat
        apiKey={`${process.env.NEBIUS_API_KEY}`}
        placeholder="Ask for tips or simplify sections..."
        onMessage={(message) => console.log('User Message:', message)}
      />
    </div>
  );
};

export default AiChat;