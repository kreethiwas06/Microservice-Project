
pipeline {
    agent any 
    environment {
        EC2_IP = "13.206.38.97"
    }
    stages {
        stage('Git checkout code') {
            steps {
                git branch: 'main', 
                credentialsId: 'Github-credentials', 
                url: 'https://github.com/umapathy1729/Microservice-Project.git'
            }
        }
        stage('Deploy to EC2 via Docker Compose') {
            steps {
                sshagent(['ec2_key2']) {
                    sh '''
                    ssh -o StrictHostKeyChecking=no ubuntu@${EC2_IP} '
                    set -e
                    
                    # 1. Navigate to the project directory or clone if it doesn\\'t exist
                    if [ -d "Microservice-Project" ]; then
                        cd Microservice-Project
                        git pull origin main
                    else
                        git clone git@github.com:umapathy1729/Microservice-Project.git
                        cd Microservice-Project
                    fi
 
                    # 2. Bring down existing containers, images, and volumes cleanly
                    docker compose down --rmi all --volumes || true
 
                    # 3. Rebuild images and start the services in detached mode
                    docker compose up -d --build
                    '
                    '''
                }
            }
        }
    }
} 
