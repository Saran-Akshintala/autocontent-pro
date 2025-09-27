// Sample Posts Generator Script
// Run this in browser console or as a Node.js script to create meaningful posts

const samplePosts = [
  {
    title: 'Welcome to Our New Product Launch',
    content: {
      hook: "🚀 Exciting news! We're launching something amazing...",
      body: "After months of development, we're thrilled to introduce our latest innovation. This product will revolutionize how you work and create. Stay tuned for more details!",
      hashtags: ['#ProductLaunch', '#Innovation', '#NewProduct', '#Exciting'],
      platforms: ['INSTAGRAM', 'LINKEDIN', 'TWITTER'],
    },
  },
  {
    title: 'Monday Motivation: Start Strong',
    content: {
      hook: '💪 Monday motivation coming your way!',
      body: 'Every Monday is a fresh start, a new opportunity to chase your dreams and achieve your goals. What will you accomplish this week? Share your goals in the comments!',
      hashtags: ['#MondayMotivation', '#Goals', '#Success', '#Inspiration'],
      platforms: ['INSTAGRAM', 'FACEBOOK', 'LINKEDIN'],
    },
  },
  {
    title: 'Behind the Scenes: Our Team',
    content: {
      hook: '👥 Meet the amazing people behind our success!',
      body: 'Our team is our greatest asset. From developers to designers, marketers to managers - each person brings unique skills and passion to everything we do.',
      hashtags: ['#TeamSpotlight', '#BehindTheScenes', '#TeamWork', '#Culture'],
      platforms: ['LINKEDIN', 'INSTAGRAM'],
    },
  },
  {
    title: 'Customer Success Story',
    content: {
      hook: '📈 Amazing results from our latest client!',
      body: "We're proud to share how our solution helped increase productivity by 40% for our client. Real results, real impact. Want to see similar results for your business?",
      hashtags: ['#CustomerSuccess', '#Results', '#Productivity', '#Business'],
      platforms: ['LINKEDIN', 'TWITTER'],
    },
  },
  {
    title: 'Tips for Better Productivity',
    content: {
      hook: '⚡ 5 productivity hacks that actually work:',
      body: '1. Time-block your calendar\n2. Use the 2-minute rule\n3. Batch similar tasks\n4. Take regular breaks\n5. Eliminate distractions\n\nWhich tip will you try first?',
      hashtags: ['#Productivity', '#Tips', '#WorkSmart', '#Efficiency'],
      platforms: ['INSTAGRAM', 'LINKEDIN', 'TWITTER'],
    },
  },
  {
    title: 'Industry Insights: Latest Trends',
    content: {
      hook: '📊 The top 3 trends shaping our industry in 2024:',
      body: 'AI integration, remote collaboration tools, and sustainable practices are leading the charge. How is your organization adapting to these changes?',
      hashtags: ['#IndustryTrends', '#2024', '#Innovation', '#Business'],
      platforms: ['LINKEDIN', 'TWITTER'],
    },
  },
  {
    title: 'Thank You to Our Community',
    content: {
      hook: '🙏 Grateful for our amazing community!',
      body: "Your support, feedback, and engagement mean everything to us. Thank you for being part of our journey and helping us grow. Here's to many more milestones together!",
      hashtags: ['#Gratitude', '#Community', '#ThankYou', '#Appreciation'],
      platforms: ['INSTAGRAM', 'FACEBOOK', 'LINKEDIN'],
    },
  },
  {
    title: 'Weekend Project Inspiration',
    content: {
      hook: '🛠️ Looking for a weekend project?',
      body: "Why not try something creative? Whether it's learning a new skill, organizing your workspace, or starting that hobby you've been putting off - weekends are perfect for personal growth!",
      hashtags: [
        '#WeekendProject',
        '#Creativity',
        '#PersonalGrowth',
        '#Inspiration',
      ],
      platforms: ['INSTAGRAM', 'FACEBOOK'],
    },
  },
  {
    title: 'Educational Content: Best Practices',
    content: {
      hook: '📚 Learn something new: Best practices for...',
      body: "Continuous learning is key to success. Whether you're a beginner or expert, there's always room to improve. What new skill are you working on this month?",
      hashtags: ['#Learning', '#BestPractices', '#Education', '#Growth'],
      platforms: ['LINKEDIN', 'TWITTER', 'INSTAGRAM'],
    },
  },
];

// Function to create posts via API (you'll need to run this in browser console)
async function createSamplePosts() {
  const apiBaseUrl = 'http://localhost:3000/api'; // Adjust this to your API URL

  for (const post of samplePosts) {
    try {
      const response = await fetch(`${apiBaseUrl}/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Add any authentication headers if needed
        },
        body: JSON.stringify({
          brandId: 'your-brand-id', // Replace with actual brand ID
          title: post.title,
          content: post.content,
        }),
      });

      if (response.ok) {
        console.log(`✅ Created post: ${post.title}`);
      } else {
        console.error(`❌ Failed to create post: ${post.title}`);
      }
    } catch (error) {
      console.error(`❌ Error creating post ${post.title}:`, error);
    }
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { samplePosts, createSamplePosts };
}

console.log(
  'Sample posts data ready. Use createSamplePosts() to generate posts via API.'
);

// Auto-run when script is executed directly with Node
if (require.main === module) {
  (async () => {
    await createSamplePosts();
    console.log('🎉 All sample posts created!');
  })();
}
