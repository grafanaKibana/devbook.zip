namespace KnowledgeHub.Data;

using KnowledgeHub.Data.Models;
using Microsoft.EntityFrameworkCore;
using MongoDB.EntityFrameworkCore.Extensions;

public class KnowledgeHubDbContext(DbContextOptions<KnowledgeHubDbContext> options) : DbContext(options)
{
    public DbSet<Document> Documents { get; set; }
    public DbSet<ChunkModel> Chunks { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Document>(entity =>
        {
            entity.ToCollection("documents");
            entity.HasKey(document => document.DocumentId);
            entity.Property(document => document.DocumentId).HasElementName("_id");
        });

        modelBuilder.Entity<ChunkModel>(entity =>
        {
            entity.ToCollection("chunks");
            entity.HasKey(chunk => chunk.ChunkId);
            entity.Property(chunk => chunk.ChunkId).HasElementName("_id");
        });
    }
}
