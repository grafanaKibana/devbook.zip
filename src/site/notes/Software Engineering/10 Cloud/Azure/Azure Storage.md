---
{"dg-publish":true,"permalink":"/software-engineering/10-cloud/azure/azure-storage/","tags":["FolderNote"],"noteIcon":""}
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
