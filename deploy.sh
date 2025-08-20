#!/bin/bash

# Indian Law Search Deployment Script
# This script automates the deployment process for all services

set -e  # Exit on any error

echo "🚀 Starting Indian Law Search Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_dependencies() {
    print_status "Checking dependencies..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm"
        exit 1
    fi
    
    # Check Docker (optional)
    if command -v docker &> /dev/null; then
        print_success "Docker found"
    else
        print_warning "Docker not found. Docker deployment will be skipped"
    fi
    
    # Check Git
    if ! command -v git &> /dev/null; then
        print_error "Git is not installed. Please install Git"
        exit 1
    fi
    
    print_success "All dependencies checked"
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    
    # Backend dependencies
    cd backend-apis
    print_status "Installing backend dependencies..."
    npm install
    cd ..
    
    # Frontend dependencies
    cd frontend
    print_status "Installing frontend dependencies..."
    npm install
    cd ..
    
    print_success "Dependencies installed"
}

# Run tests
run_tests() {
    print_status "Running comprehensive tests..."
    
    # Check if backend is running
    if curl -s http://localhost:3001/health > /dev/null; then
        print_status "Backend is running, executing tests..."
        node test-search-queries.js
        print_success "Tests completed"
    else
        print_warning "Backend not running. Start backend first: cd backend-apis && npm start"
    fi
}

# Build frontend
build_frontend() {
    print_status "Building frontend for production..."
    
    cd frontend
    npm run build
    cd ..
    
    print_success "Frontend built successfully"
}

# Docker deployment
deploy_docker() {
    if ! command -v docker &> /dev/null; then
        print_warning "Docker not available, skipping Docker deployment"
        return
    fi
    
    print_status "Deploying with Docker..."
    
    # Build and start services
    docker-compose up --build -d
    
    print_success "Docker deployment completed"
    print_status "Services available at:"
    print_status "  Frontend: http://localhost:3000"
    print_status "  Backend: http://localhost:3001"
}

# Vercel deployment
deploy_vercel() {
    print_status "Deploying frontend to Vercel..."
    
    if ! command -v vercel &> /dev/null; then
        print_warning "Vercel CLI not installed. Please install with: npm i -g vercel"
        print_status "You can deploy manually by:"
        print_status "1. Push code to GitHub"
        print_status "2. Connect repository to Vercel"
        print_status "3. Set environment variables"
        return
    fi
    
    cd frontend
    vercel --prod
    cd ..
    
    print_success "Vercel deployment completed"
}

# Render deployment
deploy_render() {
    print_status "Preparing for Render deployment..."
    
    print_status "To deploy backend to Render:"
    print_status "1. Push code to GitHub"
    print_status "2. Connect repository to Render"
    print_status "3. Set build command: npm install"
    print_status "4. Set start command: npm start"
    print_status "5. Set environment variables:"
    print_status "   - NODE_ENV=production"
    print_status "   - PORT=3001"
    print_status "   - CORS_ORIGIN=https://your-frontend-domain.vercel.app"
}

# Google Cloud Run deployment
deploy_cloud_run() {
    print_status "Preparing for Google Cloud Run deployment..."
    
    if ! command -v gcloud &> /dev/null; then
        print_warning "Google Cloud CLI not installed"
        print_status "Install with: https://cloud.google.com/sdk/docs/install"
        return
    fi
    
    # Check if user is authenticated
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
        print_warning "Not authenticated with Google Cloud"
        print_status "Run: gcloud auth login"
        return
    fi
    
    # Set project (user needs to set this)
    PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
    if [ -z "$PROJECT_ID" ]; then
        print_warning "No Google Cloud project set"
        print_status "Set project with: gcloud config set project YOUR_PROJECT_ID"
        return
    fi
    
    print_status "Building and pushing Docker image..."
    docker build -t gcr.io/$PROJECT_ID/indian-law-backend .
    docker push gcr.io/$PROJECT_ID/indian-law-backend
    
    print_status "Deploying to Cloud Run..."
    gcloud run deploy indian-law-backend \
        --image gcr.io/$PROJECT_ID/indian-law-backend \
        --platform managed \
        --region us-central1 \
        --allow-unauthenticated \
        --port 3001
    
    print_success "Cloud Run deployment completed"
}

# Health check
health_check() {
    print_status "Performing health checks..."
    
    # Check backend
    if curl -s http://localhost:3001/health > /dev/null; then
        print_success "Backend health check passed"
    else
        print_error "Backend health check failed"
    fi
    
    # Check frontend (if running)
    if curl -s http://localhost:3000 > /dev/null; then
        print_success "Frontend health check passed"
    else
        print_warning "Frontend not running on localhost:3000"
    fi
}

# Main deployment function
main() {
    echo "🔍 Indian Law Search - Deployment Script"
    echo "========================================"
    
    # Parse command line arguments
    case "${1:-all}" in
        "deps")
            check_dependencies
            install_dependencies
            ;;
        "test")
            run_tests
            ;;
        "build")
            build_frontend
            ;;
        "docker")
            deploy_docker
            ;;
        "vercel")
            deploy_vercel
            ;;
        "render")
            deploy_render
            ;;
        "cloud-run")
            deploy_cloud_run
            ;;
        "health")
            health_check
            ;;
        "all")
            check_dependencies
            install_dependencies
            run_tests
            build_frontend
            deploy_docker
            ;;
        *)
            echo "Usage: $0 {deps|test|build|docker|vercel|render|cloud-run|health|all}"
            echo ""
            echo "Commands:"
            echo "  deps      - Check and install dependencies"
            echo "  test      - Run comprehensive tests"
            echo "  build     - Build frontend for production"
            echo "  docker    - Deploy with Docker Compose"
            echo "  vercel    - Deploy frontend to Vercel"
            echo "  render    - Prepare for Render deployment"
            echo "  cloud-run - Deploy to Google Cloud Run"
            echo "  health    - Perform health checks"
            echo "  all       - Run all deployment steps"
            exit 1
            ;;
    esac
    
    print_success "Deployment completed successfully! 🎉"
}

# Run main function
main "$@"
