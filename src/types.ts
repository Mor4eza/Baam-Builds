export interface IOSBuild {
  date: string;
  title: string;
  desc: string;
  plistUrl: string;
  version: string;
  id: string;
  build: number;

}

export interface APIResponse {
  success: boolean;
  data: IOSBuild[];
  isFallback: boolean;
  error?: string;
}
