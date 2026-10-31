namespace DevBook.Tooling.Export;

internal static class SyncerProbes
{
    internal const string FullPublish = """
        (async()=>{
         const publisher=app.plugins.plugins['quartz-syncer'].getPublisher();
         if(!publisher)return JSON.stringify({success:false,error:'Publisher is not configured'});
         publisher.beginDynamicSession();
         try{
          const status=await publisher.getPublishStatus();
          const result=await publisher.publishBatch([...status.unpublished,...status.changed,...status.published],'Refresh notes and referenced assets before commit');
          if(!result||typeof result.success!=='boolean'||(result.success&&(!Number.isInteger(result.filesPublished)||!Number.isInteger(result.filesDeleted))))throw new Error('Malformed publication result');
          return JSON.stringify({success:result.success,data:result,error:result.error});
         }catch(error){return JSON.stringify({success:false,error:error instanceof Error?error.message:String(error)});}
         finally{publisher.endDynamicSession();}
        })()
        """;

    internal const string CompiledMediaCleanup = """
        (async()=>{
         const publisher=app.plugins.plugins['quartz-syncer'].getPublisher();
         if(!publisher)return JSON.stringify({success:false,error:'Publisher is not configured'});
         publisher.beginDynamicSession();
         try{
          const result=await publisher.cleanOrphanedMedia();
          if(result===null)return JSON.stringify({success:true,data:{outcome:'unchanged-or-withheld'}});
          if(!result||typeof result.success!=='boolean')throw new Error('Malformed cleanup result');
          return JSON.stringify({success:result.success,data:{...result,outcome:'cleaned'},error:result.error});
         }catch(error){return JSON.stringify({success:false,error:error instanceof Error?error.message:String(error)});}
         finally{publisher.endDynamicSession();}
        })()
        """;

    internal const string IndexState = """
        JSON.stringify((()=>{
         const plugin=app.plugins.plugins['quartz-syncer'];
         const key=plugin.settings.publishFrontmatterKey;
         const files=app.vault.getMarkdownFiles().filter(f=>f.path.startsWith('Home/'));
         const native=files.filter(f=>!!app.metadataCache.getFileCache(f)?.frontmatter?.[key]).map(f=>f.path);
         const extended=plugin.cacheHandle?.api;
         const visible=f=>!f.path.split('/').some(part=>part.startsWith('.'));
         const all=app.vault.getFiles().filter(visible);
         const observedStats=Object.fromEntries(all.map(f=>[f.path,{mtime:f.stat.mtime,size:f.stat.size}]));
         const metadataStats=Object.fromEntries(app.vault.getMarkdownFiles().filter(visible).map(f=>{
          const entry=app.metadataCache.fileCache[f.path];
          return [f.path,entry?{mtime:entry.mtime,size:entry.size}:null];
         }));
         return {inventory:all.map(f=>f.path),observedStats,metadataStats,
          nativePublishPaths:native,extendedReady:extended?.isReady===true,
          extendedPublishPaths:extended?.isReady?Array.from(extended.getFilesWithFrontmatterValue(key,true)).filter(p=>p.startsWith('Home/')&&p.toLowerCase().endsWith('.md')):[]};
        })())
        """;

}
