namespace KnowledgeHub.Data;

using Microsoft.EntityFrameworkCore;

public class KnowledgeHubDbContext(DbContextOptions<KnowledgeHubDbContext> options) : DbContext(options)
{
    public DbSet<Document> Documents { get; set; }
    public DbSet<ChunkModel> Chunks { get; set; }
}
