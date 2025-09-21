import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="home">
      <div class="container">
        <div class="hero">
          <h2>Welcome to AutoContent Pro! 🚀</h2>
          <p>Your all-in-one solution for automated social media content marketing.</p>
          
          <div class="features">
            <div class="feature-card">
              <h3>📊 Analytics Dashboard</h3>
              <p>Track your social media performance with detailed analytics.</p>
            </div>
            <div class="feature-card">
              <h3>🤖 AI Content Generation</h3>
              <p>Generate engaging content using advanced AI algorithms.</p>
            </div>
            <div class="feature-card">
              <h3>📱 WhatsApp Integration</h3>
              <p>Automate WhatsApp marketing campaigns seamlessly.</p>
            </div>
          </div>

          <div class="api-status" *ngIf="apiStatus">
            <h3>API Status</h3>
            <div class="status-card" [class.online]="apiStatus.online">
              <p><strong>Status:</strong> {{ apiStatus.online ? 'Online' : 'Offline' }}</p>
              <p><strong>Message:</strong> {{ apiStatus.message }}</p>
              <p><strong>Last Check:</strong> {{ apiStatus.timestamp | date:'medium' }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .home {
      padding: 3rem 0;
    }

    .hero {
      text-align: center;
      max-width: 800px;
      margin: 0 auto;
    }

    .hero h2 {
      font-size: 2.5rem;
      margin-bottom: 1rem;
      color: #1f2937;
    }

    .hero > p {
      font-size: 1.2rem;
      color: #6b7280;
      margin-bottom: 3rem;
    }

    .features {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 2rem;
      margin-bottom: 3rem;
    }

    .feature-card {
      background: white;
      padding: 2rem;
      border-radius: 1rem;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      transition: transform 0.2s ease;
    }

    .feature-card:hover {
      transform: translateY(-4px);
    }

    .feature-card h3 {
      margin: 0 0 1rem 0;
      color: #1f2937;
      font-size: 1.25rem;
    }

    .feature-card p {
      margin: 0;
      color: #6b7280;
      line-height: 1.6;
    }

    .api-status {
      margin-top: 3rem;
    }

    .api-status h3 {
      color: #1f2937;
      margin-bottom: 1rem;
    }

    .status-card {
      background: #fee2e2;
      border: 1px solid #fecaca;
      padding: 1.5rem;
      border-radius: 0.5rem;
      text-align: left;
      max-width: 400px;
      margin: 0 auto;
    }

    .status-card.online {
      background: #dcfce7;
      border-color: #bbf7d0;
    }

    .status-card p {
      margin: 0.5rem 0;
      color: #374151;
    }
  `]
})
export class HomeComponent implements OnInit {
  apiStatus: any = null;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.checkApiStatus();
  }

  private checkApiStatus() {
    this.http.get('http://localhost:3000/api').subscribe({
      next: (response: any) => {
        this.apiStatus = {
          online: true,
          message: response.message,
          timestamp: new Date()
        };
      },
      error: (error) => {
        this.apiStatus = {
          online: false,
          message: 'API is not responding. Make sure the API server is running.',
          timestamp: new Date()
        };
      }
    });
  }
}
