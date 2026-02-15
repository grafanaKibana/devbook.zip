---
{"dg-publish":true,"permalink":"/software-engineering/10-cloud/google-cloud/google-cloud/","tags":["FolderNote"],"noteIcon":""}
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

# Whats next

:LiArrowUpLeft: [[Software Engineering/10 Cloud/10 Cloud\|10 Cloud]]

<h2><span>Pages</span></h2><div><ul class="dataview list-view-ul"><li><span><a data-tooltip-position="top" aria-label="Software Engineering/10 Cloud/Google Cloud/BigQuery.md" data-href="Software Engineering/10 Cloud/Google Cloud/BigQuery.md" href="Software Engineering/10 Cloud/Google Cloud/BigQuery.md" class="internal-link" target="_blank" rel="noopener nofollow">BigQuery</a></span></li><li><span><a data-tooltip-position="top" aria-label="Software Engineering/10 Cloud/Google Cloud/Cloud Functions.md" data-href="Software Engineering/10 Cloud/Google Cloud/Cloud Functions.md" href="Software Engineering/10 Cloud/Google Cloud/Cloud Functions.md" class="internal-link" target="_blank" rel="noopener nofollow">Cloud Functions</a></span></li><li><span><a data-tooltip-position="top" aria-label="Software Engineering/10 Cloud/Google Cloud/Cloud Spanner.md" data-href="Software Engineering/10 Cloud/Google Cloud/Cloud Spanner.md" href="Software Engineering/10 Cloud/Google Cloud/Cloud Spanner.md" class="internal-link" target="_blank" rel="noopener nofollow">Cloud Spanner</a></span></li><li><span><a data-tooltip-position="top" aria-label="Software Engineering/10 Cloud/Google Cloud/Cloud Storage.md" data-href="Software Engineering/10 Cloud/Google Cloud/Cloud Storage.md" href="Software Engineering/10 Cloud/Google Cloud/Cloud Storage.md" class="internal-link" target="_blank" rel="noopener nofollow">Cloud Storage</a></span></li><li><span><a data-tooltip-position="top" aria-label="Software Engineering/10 Cloud/Google Cloud/Firebase.md" data-href="Software Engineering/10 Cloud/Google Cloud/Firebase.md" href="Software Engineering/10 Cloud/Google Cloud/Firebase.md" class="internal-link" target="_blank" rel="noopener nofollow">Firebase</a></span></li></ul></div>
