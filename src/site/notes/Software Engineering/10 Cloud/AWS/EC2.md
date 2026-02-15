---
{"dg-publish":true,"permalink":"/software-engineering/10-cloud/aws/ec-2/","noteIcon":""}
---


# Intro

Amazon EC2 provides virtual machines.

Core concerns: instance types, AMIs, security groups, networking (VPC/subnets), and autoscaling.

## Example

Describe instances:

```bash
aws ec2 describe-instances --max-items 10
```

## Links

- [Amazon EC2 documentation](https://docs.aws.amazon.com/ec2/)
