// Use a dynamic config so env vars are injected at runtime
export default ({ config }) => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  return {
    ...config,
    extra: {
      ...(config.extra || {}),
      supabaseUrl,
      supabaseAnonKey,
    },
  };
};