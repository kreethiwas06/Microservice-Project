pipeline {
    agent any 
    environment {
        EC2_IP = "54.242.177.2"
    }
    stages {
        stage('Git checkout code') {
            steps {
                git branch: 'main', 
                credentialsId: 'aws cred', 
                url: 'https://github.com/kreethiwas06/Microservice-Project.git'
            }
        }
        stage('Deploy to EC2') {
            steps {
                sshagent(['demo-key-ec2']) {
                    sh '''
                    ssh -o StrictHostKeyChecking=no ubuntu@${EC2_IP} '
                    set -e
                    rm -rf Microservice-Project
                    git clone git@github.com:kreethiwas06/Microservice-Project.git

                    cd Microservice-Project
                    git checkout main
                    git pull origin main

                    docker system prune -f &&
                    docker compose down &&
                    docker compose up -d --build

                    '
                    '''
                }
            }
        }
    }
}
