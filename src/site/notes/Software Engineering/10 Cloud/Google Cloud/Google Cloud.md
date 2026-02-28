---
{"dg-publish":true,"permalink":"/software-engineering/10-cloud/google-cloud/google-cloud/","tags":["FolderNote"],"noteIcon":"3"}
---


# Intro

Google Cloud (GCP) is a public cloud platform that provides compute, storage, managed databases, messaging, networking, and IAM.

This folder is the canonical place for Google Cloud notes in this vault, including service pages (Cloud Functions, Spanner, Firebase, Storage, BigQuery).

## Example

Set the active project and list VM instances with the `gcloud` CLI:

```bash
gcloud config set project "my-project-id"
gcloud compute instances list
```


## Questions

> [!QUESTION]- What is a good way to learn GCP services systematically?
> Start from core building blocks (IAM, networking, compute, storage), then add managed databases and messaging. For each service page, capture: what it is, key use cases, a minimal CLI example, and 1-2 reference links.

## Links

- [Google Cloud documentation](https://cloud.google.com/docs)

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/10 Cloud/10 Cloud\|10 Cloud]]
>
> **Pages**
> - [[Software Engineering/10 Cloud/Google Cloud/BigQuery\|BigQuery]]
> - [[Software Engineering/10 Cloud/Google Cloud/Cloud Functions\|Cloud Functions]]
> - [[Software Engineering/10 Cloud/Google Cloud/Cloud Spanner\|Cloud Spanner]]
> - [[Software Engineering/10 Cloud/Google Cloud/Cloud Storage\|Cloud Storage]]
> - [[Software Engineering/10 Cloud/Google Cloud/Firebase\|Firebase]]
<!-- whats-next:end -->
