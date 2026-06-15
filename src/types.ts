export interface IOSBuild {
  date: string;
  title: string;
  desc: string;
  plistUrl: string;
}

export interface APIResponse {
  success: boolean;
  data: IOSBuild[];
  isFallback: boolean;
  error?: string;
}
