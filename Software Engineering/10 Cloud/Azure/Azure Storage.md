---
topic:
  - Cloud
subtopic:
  - Azure
level:
  - "3"
priority: Medium
status: Creation
tags:
  - FolderNote
---

# Intro

Azure Storage is a family of services for durable storage: Blobs (object storage), Files (SMB shares), Queues (messaging), and Tables (key-value).

## Example

Create a storage account with Azure CLI:

```bash
az storage account create \
  --name mystorageacct123 \
  --resource-group my-rg \
  --location westeurope \
  --sku Standard_LRS
```

## Links

- [Azure Storage documentation](https://learn.microsoft.com/en-us/azure/storage/)
