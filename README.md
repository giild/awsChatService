# awsChatService
This is the repository for GiiLD's aws chat service challenge. The goal is to learn how to configure API Gateway to use websockets for a simple chat service that supports channels

### GiiLD website
[GiiLD.com](http://www.giild.com)

[GiiLD.net](http://www.giild.net)

[https://www.giild.net/challenges/single/0a172e9e-897b-41f1-9671-2c6df3e2618e] Challenge description

## Dependencies

AWS
API Gateway
Lambda Functions
Nodejs v12
DynamoDB

## Overview

The example is based on Amazon's simple-websockets-chat-app. It has a couple of improvements and changes to make it more useful for learners. 
* the template uses a zip file to package the nodejs services
* it creates a second table for the channels
* sendMessage service will send the message to other people in the same channel
* to join a channel, you have to explicitly join the channel

AWS repository for simple-websockets-chat-app [https://github.com/aws-samples/simple-websockets-chat-app]

## Getting started

People taking the challenge should try to do it on their own first. Here are the steps to deploy the API. It assumes you have an AWS account.

* make a file named services.zip with the three .js files
* create a S3 bucket named "chat-artifacts" to upload the zip file
* upload the zip to chat-artifacts bucket
* use cloudformation to create and configure the stack