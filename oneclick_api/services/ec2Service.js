/**
 * EC2 Service - AWS SDK wrapper for EC2 operations
 * 
 * This service handles all EC2 interactions including:
 * - Launching new instances
 * - Describing instance status
 * - Starting/stopping instances
 * - Terminating instances
 * - Fetching console logs
 */

const {
  EC2Client,
  RunInstancesCommand,
  DescribeInstancesCommand,
  StopInstancesCommand,
  StartInstancesCommand,
  TerminateInstancesCommand,
  GetConsoleOutputCommand,
} = require('@aws-sdk/client-ec2');

// Initialize EC2 client with environment configuration
const ec2Client = new EC2Client({
  region: process.env.AWS_REGION || 'ap-southeast-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

/**
 * Launch a new EC2 instance
 * @param {Object} config - Launch configuration
 * @param {string} config.name - Instance name tag
 * @param {string} config.instanceType - EC2 instance type (e.g., 't2.micro')
 * @param {string} config.userData - Base64-encoded UserData script
 * @param {string} [config.amiId] - AMI ID (defaults to env AMI)
 * @param {string} [config.keyPairName] - Key pair name (defaults to env key)
 * @param {string} [config.securityGroupId] - Security group ID (defaults to env SG)
 * @returns {Promise<Object>} - Launched instance details
 */
async function launchInstance(config) {
  const {
    name,
    instanceType = 't2.micro',
    userData,
    amiId = process.env.EC2_AMI_ID,
    keyPairName = process.env.EC2_KEY_PAIR_NAME,
    securityGroupId = process.env.EC2_SECURITY_GROUP_ID,
  } = config;

  const params = {
    ImageId: amiId,
    InstanceType: instanceType,
    KeyName: keyPairName,
    SecurityGroupIds: [securityGroupId],
    MinCount: 1,
    MaxCount: 1,
    UserData: userData,
    TagSpecifications: [
      {
        ResourceType: 'instance',
        Tags: [
          { Key: 'Name', Value: name },
          { Key: 'ManagedBy', Value: 'oneclick-deployer' },
          { Key: 'CreatedAt', Value: new Date().toISOString() },
        ],
      },
    ],
  };

  const command = new RunInstancesCommand(params);
  const response = await ec2Client.send(command);
  
  const instance = response.Instances[0];
  
  return {
    instanceId: instance.InstanceId,
    state: instance.State.Name,
    publicIp: instance.PublicIpAddress || null,
    privateIp: instance.PrivateIpAddress || null,
    instanceType: instance.InstanceType,
    launchTime: instance.LaunchTime,
  };
}

/**
 * Describe one or more EC2 instances
 * @param {string[]} [instanceIds] - Array of instance IDs (optional, filters by ManagedBy tag if empty)
 * @returns {Promise<Object[]>} - Array of instance details
 */
async function describeInstances(instanceIds = []) {
  const params = {};
  
  if (instanceIds.length > 0) {
    params.InstanceIds = instanceIds;
  } else {
    // Filter by our managed tag if no specific IDs provided
    params.Filters = [
      {
        Name: 'tag:ManagedBy',
        Values: ['oneclick-deployer'],
      },
    ];
  }

  const command = new DescribeInstancesCommand(params);
  const response = await ec2Client.send(command);
  
  const instances = [];
  
  for (const reservation of response.Reservations || []) {
    for (const instance of reservation.Instances || []) {
      const nameTag = instance.Tags?.find(tag => tag.Key === 'Name');
      
      instances.push({
        instanceId: instance.InstanceId,
        name: nameTag?.Value || 'Unnamed',
        state: instance.State.Name,
        publicIp: instance.PublicIpAddress || null,
        privateIp: instance.PrivateIpAddress || null,
        instanceType: instance.InstanceType,
        launchTime: instance.LaunchTime,
        tags: instance.Tags || [],
      });
    }
  }
  
  return instances;
}

/**
 * Stop a running EC2 instance
 * @param {string} instanceId - Instance ID to stop
 * @returns {Promise<Object>} - Stop operation result
 */
async function stopInstance(instanceId) {
  const command = new StopInstancesCommand({
    InstanceIds: [instanceId],
  });
  
  const response = await ec2Client.send(command);
  const stoppingInstance = response.StoppingInstances[0];
  
  return {
    instanceId: stoppingInstance.InstanceId,
    previousState: stoppingInstance.PreviousState.Name,
    currentState: stoppingInstance.CurrentState.Name,
  };
}

/**
 * Start a stopped EC2 instance
 * @param {string} instanceId - Instance ID to start
 * @returns {Promise<Object>} - Start operation result
 */
async function startInstance(instanceId) {
  const command = new StartInstancesCommand({
    InstanceIds: [instanceId],
  });
  
  const response = await ec2Client.send(command);
  const startingInstance = response.StartingInstances[0];
  
  return {
    instanceId: startingInstance.InstanceId,
    previousState: startingInstance.PreviousState.Name,
    currentState: startingInstance.CurrentState.Name,
  };
}

/**
 * Terminate an EC2 instance
 * @param {string} instanceId - Instance ID to terminate
 * @returns {Promise<Object>} - Terminate operation result
 */
async function terminateInstance(instanceId) {
  const command = new TerminateInstancesCommand({
    InstanceIds: [instanceId],
  });
  
  const response = await ec2Client.send(command);
  const terminatingInstance = response.TerminatingInstances[0];
  
  return {
    instanceId: terminatingInstance.InstanceId,
    previousState: terminatingInstance.PreviousState.Name,
    currentState: terminatingInstance.CurrentState.Name,
  };
}

/**
 * Get console output (logs) from an EC2 instance
 * @param {string} instanceId - Instance ID to get logs from
 * @returns {Promise<Object>} - Console output result
 */
async function getConsoleLogs(instanceId) {
  const command = new GetConsoleOutputCommand({
    InstanceId: instanceId,
  });
  
  const response = await ec2Client.send(command);
  
  // Console output is base64 encoded
  let decodedOutput = '';
  if (response.Output) {
    decodedOutput = Buffer.from(response.Output, 'base64').toString('utf-8');
  }
  
  return {
    instanceId: response.InstanceId,
    timestamp: response.Timestamp,
    output: decodedOutput,
  };
}

module.exports = {
  ec2Client,
  launchInstance,
  describeInstances,
  stopInstance,
  startInstance,
  terminateInstance,
  getConsoleLogs,
};
