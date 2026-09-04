import type { HttpRequestDraft } from "@shared/types";
import { requestToCurl } from "../share-request";
import {
  escDouble,
  escSingle,
  hasBody,
  normalizeRequest,
  type NormalizedRequest,
} from "./common";

export type SnippetId =
  | "c-libcurl"
  | "csharp-httpclient"
  | "csharp-restsharp"
  | "curl"
  | "dart-dio"
  | "dart-http"
  | "go-native"
  | "http"
  | "java-okhttp"
  | "java-unirest"
  | "js-fetch"
  | "js-jquery"
  | "js-xhr"
  | "kotlin-okhttp"
  | "nodejs-axios"
  | "nodejs-native"
  | "nodejs-request"
  | "nodejs-unirest"
  | "objc-nsurlsession"
  | "ocaml-cohttp"
  | "php-curl"
  | "php-guzzle"
  | "php-httprequest2"
  | "php-pecl-http"
  | "postman-cli"
  | "powershell-restmethod"
  | "python-httpclient"
  | "python-requests"
  | "r-httr"
  | "r-rcurl"
  | "ruby-nethttp"
  | "rust-reqwest"
  | "shell-httpie"
  | "shell-wget"
  | "swift-urlsession";

export interface SnippetTarget {
  id: SnippetId;
  label: string;
}

export const SNIPPET_TARGETS: SnippetTarget[] = [
  { id: "c-libcurl", label: "C - libcurl" },
  { id: "csharp-httpclient", label: "C# - HttpClient" },
  { id: "csharp-restsharp", label: "C# - RestSharp" },
  { id: "curl", label: "cURL" },
  { id: "dart-dio", label: "Dart - dio" },
  { id: "dart-http", label: "Dart - http" },
  { id: "go-native", label: "Go - Native" },
  { id: "http", label: "HTTP" },
  { id: "java-okhttp", label: "Java - OkHttp" },
  { id: "java-unirest", label: "Java - Unirest" },
  { id: "js-fetch", label: "JavaScript - Fetch" },
  { id: "js-jquery", label: "JavaScript - jQuery" },
  { id: "js-xhr", label: "JavaScript - XHR" },
  { id: "kotlin-okhttp", label: "Kotlin - Okhttp" },
  { id: "nodejs-axios", label: "NodeJs - Axios" },
  { id: "nodejs-native", label: "NodeJs - Native" },
  { id: "nodejs-request", label: "NodeJs - Request" },
  { id: "nodejs-unirest", label: "NodeJs - Unirest" },
  { id: "objc-nsurlsession", label: "Objective-C - NSURLSession" },
  { id: "ocaml-cohttp", label: "OCaml - Cohttp" },
  { id: "php-curl", label: "PHP - cURL" },
  { id: "php-guzzle", label: "PHP - Guzzle" },
  { id: "php-httprequest2", label: "PHP - HTTP_Request2" },
  { id: "php-pecl-http", label: "PHP - pecl_http" },
  { id: "postman-cli", label: "Postman CLI" },
  { id: "powershell-restmethod", label: "PowerShell - RestMethod" },
  { id: "python-httpclient", label: "Python - http.client" },
  { id: "python-requests", label: "Python - Requests" },
  { id: "r-httr", label: "R - httr" },
  { id: "r-rcurl", label: "R - RCurl" },
  { id: "ruby-nethttp", label: "Ruby - Net::HTTP" },
  { id: "rust-reqwest", label: "Rust - reqwest" },
  { id: "shell-httpie", label: "Shell - Httpie" },
  { id: "shell-wget", label: "Shell - wget" },
  { id: "swift-urlsession", label: "Swift - URLSession" },
];

function genHttp(n: NormalizedRequest): string {
  const u = new URL(n.url);
  const path = `${u.pathname}${u.search}` || "/";
  const lines = [`${n.method} ${path} HTTP/1.1`, `Host: ${u.host}`];
  for (const h of n.headers) lines.push(`${h.key}: ${h.value}`);
  if (hasBody(n.method) && n.body) {
    lines.push("", n.body);
  }
  return lines.join("\n");
}

function genCLibcurl(n: NormalizedRequest): string {
  const headers = n.headers
    .map((h) => `  curl_slist_append(headers, "${escDouble(`${h.key}: ${h.value}`)}");`)
    .join("\n");
  return [
    "#include <stdio.h>",
    "#include <curl/curl.h>",
    "",
    "int main(void) {",
    "  CURL *curl = curl_easy_init();",
    "  if (!curl) return 1;",
    "  struct curl_slist *headers = NULL;",
    headers || "  (void)headers;",
    `  curl_easy_setopt(curl, CURLOPT_URL, "${escDouble(n.url)}");`,
    `  curl_easy_setopt(curl, CURLOPT_CUSTOMREQUEST, "${n.method}");`,
    n.headers.length ? "  curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);" : "",
    hasBody(n.method) && n.body
      ? `  curl_easy_setopt(curl, CURLOPT_POSTFIELDS, "${escDouble(n.body)}");`
      : "",
    "  CURLcode res = curl_easy_perform(curl);",
    "  if (res != CURLE_OK) fprintf(stderr, \"%s\\n\", curl_easy_strerror(res));",
    "  curl_slist_free_all(headers);",
    "  curl_easy_cleanup(curl);",
    "  return 0;",
    "}",
  ]
    .filter(Boolean)
    .join("\n");
}

function genCsharpHttpClient(n: NormalizedRequest): string {
  const headerLines = n.headers
    .filter((h) => h.key.toLowerCase() !== "content-type")
    .map((h) => `client.DefaultRequestHeaders.Add("${escDouble(h.key)}", "${escDouble(h.value)}");`)
    .join("\n");
  const ct = n.contentType;
  const bodyBlock =
    hasBody(n.method) && n.body
      ? [
          `var content = new StringContent(${JSON.stringify(n.body)}${ct ? `, System.Text.Encoding.UTF8, "${escDouble(ct)}"` : ""});`,
          `var response = await client.SendAsync(new HttpRequestMessage(HttpMethod.${methodToCsharp(n.method)}, "${escDouble(n.url)}") { Content = content });`,
        ]
      : [
          `var request = new HttpRequestMessage(HttpMethod.${methodToCsharp(n.method)}, "${escDouble(n.url)}");`,
          "var response = await client.SendAsync(request);",
        ];
  return [
    "using System.Net.Http;",
    "using System.Threading.Tasks;",
    "",
    "var client = new HttpClient();",
    headerLines,
    ...bodyBlock,
    "var body = await response.Content.ReadAsStringAsync();",
    "Console.WriteLine(body);",
  ]
    .filter(Boolean)
    .join("\n");
}

function methodToCsharp(method: string): string {
  const map: Record<string, string> = {
    GET: "Get",
    POST: "Post",
    PUT: "Put",
    DELETE: "Delete",
    HEAD: "Head",
    OPTIONS: "Options",
    PATCH: "Patch",
  };
  return map[method] ?? "Get";
}

function genCsharpRestSharp(n: NormalizedRequest): string {
  const headers = n.headers
    .map((h) => `request.AddHeader("${escDouble(h.key)}", "${escDouble(h.value)}");`)
    .join("\n");
  return [
    "using RestSharp;",
    "",
    `var client = new RestClient("${escDouble(n.url)}");`,
    `var request = new RestRequest("", Method.${n.method});`,
    headers,
    hasBody(n.method) && n.body ? `request.AddStringBody(${JSON.stringify(n.body)}, ContentType.Json);` : "",
    "var response = await client.ExecuteAsync(request);",
    "Console.WriteLine(response.Content);",
  ]
    .filter(Boolean)
    .join("\n");
}

function genDartDioClean(n: NormalizedRequest): string {
  const headerMap = n.headers.length
    ? `{\n${n.headers.map((h) => `      '${escSingle(h.key)}': '${escSingle(h.value)}',`).join("\n")}\n    }`
    : null;
  return [
    "import 'package:dio/dio.dart';",
    "",
    "void main() async {",
    "  final dio = Dio();",
    "  final response = await dio.request(",
    `    '${escSingle(n.url)}',`,
    hasBody(n.method) && n.body ? `    data: ${JSON.stringify(n.body)},` : "",
    "    options: Options(",
    `      method: '${n.method}',`,
    headerMap ? `      headers: ${headerMap},` : "",
    "    ),",
    "  );",
    "  print(response.data);",
    "}",
  ]
    .filter(Boolean)
    .join("\n");
}

function genDartHttp(n: NormalizedRequest): string {
  return [
    "import 'package:http/http.dart' as http;",
    "",
    "void main() async {",
    `  final request = http.Request('${n.method}', Uri.parse('${escSingle(n.url)}'));`,
    ...n.headers.map((h) => `  request.headers['${escSingle(h.key)}'] = '${escSingle(h.value)}';`),
    hasBody(n.method) && n.body ? `  request.body = ${JSON.stringify(n.body)};` : "",
    "  final streamed = await request.send();",
    "  final response = await http.Response.fromStream(streamed);",
    "  print(response.body);",
    "}",
  ]
    .filter(Boolean)
    .join("\n");
}

function genGoNative(n: NormalizedRequest): string {
  const headerSet = n.headers
    .map((h) => `\treq.Header.Set("${escDouble(h.key)}", "${escDouble(h.value)}")`)
    .join("\n");
  return [
    "package main",
    "",
    "import (",
    '\t"fmt"',
    '\t"io"',
    '\t"net/http"',
    hasBody(n.method) && n.body ? '\t"strings"' : "",
    ")",
    "",
    "func main() {",
    hasBody(n.method) && n.body
      ? `\tpayload := strings.NewReader(${JSON.stringify(n.body)})`
      : "\tvar payload io.Reader",
    hasBody(n.method) && n.body ? "" : "\tpayload = nil",
    `\treq, err := http.NewRequest("${n.method}", "${escDouble(n.url)}", payload)`,
    "\tif err != nil {",
    "\t\tpanic(err)",
    "\t}",
    headerSet,
    "\tres, err := http.DefaultClient.Do(req)",
    "\tif err != nil {",
    "\t\tpanic(err)",
    "\t}",
    "\tdefer res.Body.Close()",
    "\tbody, _ := io.ReadAll(res.Body)",
    "\tfmt.Println(string(body))",
    "}",
  ]
    .filter((line) => line !== undefined)
    .join("\n");
}

function genJavaOkHttp(n: NormalizedRequest): string {
  const headers = n.headers
    .map((h) => `      .addHeader("${escDouble(h.key)}", "${escDouble(h.value)}")`)
    .join("\n");
  return [
    "OkHttpClient client = new OkHttpClient();",
    "",
    hasBody(n.method) && n.body
      ? `MediaType mediaType = MediaType.parse("${escDouble(n.contentType || "text/plain")}");\nRequestBody body = RequestBody.create(${JSON.stringify(n.body)}, mediaType);`
      : "RequestBody body = null;",
    "Request request = new Request.Builder()",
    `      .url("${escDouble(n.url)}")`,
    `      .method("${n.method}", body)`,
    headers,
    "      .build();",
    "Response response = client.newCall(request).execute();",
  ]
    .filter(Boolean)
    .join("\n");
}

function genJavaUnirest(n: NormalizedRequest): string {
  const headers = n.headers
    .map((h) => `  .header("${escDouble(h.key)}", "${escDouble(h.value)}")`)
    .join("\n");
  return [
    `HttpResponse<String> response = Unirest.${n.method.toLowerCase()}("${escDouble(n.url)}")`,
    headers,
    hasBody(n.method) && n.body ? `  .body(${JSON.stringify(n.body)})` : "",
    "  .asString();",
  ]
    .filter(Boolean)
    .join("\n");
}

function genJsFetch(n: NormalizedRequest): string {
  const headers =
    n.headers.length > 0
      ? `  headers: {\n${n.headers.map((h) => `    "${escDouble(h.key)}": "${escDouble(h.value)}",`).join("\n")}\n  },`
      : "";
  return [
    `fetch("${escDouble(n.url)}", {`,
    `  method: "${n.method}",`,
    headers,
    hasBody(n.method) && n.body ? `  body: ${JSON.stringify(n.body)},` : "",
    "})",
    "  .then(res => res.text())",
    "  .then(console.log)",
    "  .catch(console.error);",
  ]
    .filter(Boolean)
    .join("\n");
}

function genJsJquery(n: NormalizedRequest): string {
  const headers =
    n.headers.length > 0
      ? `  headers: {\n${n.headers.map((h) => `    "${escDouble(h.key)}": "${escDouble(h.value)}",`).join("\n")}\n  },`
      : "";
  return [
    "$.ajax({",
    `  url: "${escDouble(n.url)}",`,
    `  method: "${n.method}",`,
    headers,
    hasBody(n.method) && n.body ? `  data: ${JSON.stringify(n.body)},` : "",
    "  success: function(response) {",
    "    console.log(response);",
    "  }",
    "});",
  ]
    .filter(Boolean)
    .join("\n");
}

function genJsXhr(n: NormalizedRequest): string {
  return [
    "var xhr = new XMLHttpRequest();",
    `xhr.open("${n.method}", "${escDouble(n.url)}");`,
    ...n.headers.map((h) => `xhr.setRequestHeader("${escDouble(h.key)}", "${escDouble(h.value)}");`),
    "xhr.onload = function() {",
    "  console.log(xhr.responseText);",
    "};",
    hasBody(n.method) && n.body
      ? `xhr.send(${JSON.stringify(n.body)});`
      : "xhr.send();",
  ].join("\n");
}

function genKotlinOkHttp(n: NormalizedRequest): string {
  const headers = n.headers
    .map((h) => `  .addHeader("${escDouble(h.key)}", "${escDouble(h.value)}")`)
    .join("\n");
  return [
    "val client = OkHttpClient()",
    "",
    hasBody(n.method) && n.body
      ? `val mediaType = "${escDouble(n.contentType || "text/plain")}".toMediaType()\nval body = ${JSON.stringify(n.body)}.toRequestBody(mediaType)`
      : "val body: RequestBody? = null",
    "val request = Request.Builder()",
    `  .url("${escDouble(n.url)}")`,
    `  .method("${n.method}", body)`,
    headers,
    "  .build()",
    "",
    "client.newCall(request).execute().use { response ->",
    "  println(response.body?.string())",
    "}",
  ]
    .filter(Boolean)
    .join("\n");
}

function genNodeAxios(n: NormalizedRequest): string {
  const headers =
    n.headers.length > 0
      ? `  headers: {\n${n.headers.map((h) => `    '${escSingle(h.key)}': '${escSingle(h.value)}',`).join("\n")}\n  },`
      : "";
  return [
    "const axios = require('axios');",
    "",
    "axios.request({",
    `  method: '${n.method}',`,
    `  url: '${escSingle(n.url)}',`,
    headers,
    hasBody(n.method) && n.body ? `  data: ${JSON.stringify(n.body)},` : "",
    "})",
    "  .then(res => console.log(res.data))",
    "  .catch(err => console.error(err));",
  ]
    .filter(Boolean)
    .join("\n");
}

function genNodeNative(n: NormalizedRequest): string {
  let parsed: URL;
  try {
    parsed = new URL(n.url);
  } catch {
    parsed = new URL("https://example.com");
  }
  const isHttps = parsed.protocol === "https:";
  const headersObj = n.headers.map((h) => `    '${escSingle(h.key)}': '${escSingle(h.value)}'`).join(",\n");
  return [
    `const http = require('${isHttps ? "https" : "http"}');`,
    "",
    "const options = {",
    `  method: '${n.method}',`,
    `  hostname: '${escSingle(parsed.hostname)}',`,
    parsed.port ? `  port: ${parsed.port},` : "",
    `  path: '${escSingle(parsed.pathname + parsed.search)}',`,
    headersObj ? `  headers: {\n${headersObj}\n  },` : "",
    "};",
    "",
    "const req = http.request(options, (res) => {",
    "  const chunks = [];",
    "  res.on('data', (chunk) => chunks.push(chunk));",
    "  res.on('end', () => console.log(Buffer.concat(chunks).toString()));",
    "});",
    "",
    "req.on('error', console.error);",
    hasBody(n.method) && n.body ? `req.write(${JSON.stringify(n.body)});` : "",
    "req.end();",
  ]
    .filter(Boolean)
    .join("\n");
}

function genNodeRequest(n: NormalizedRequest): string {
  const headers =
    n.headers.length > 0
      ? `  headers: {\n${n.headers.map((h) => `    '${escSingle(h.key)}': '${escSingle(h.value)}',`).join("\n")}\n  },`
      : "";
  return [
    "const request = require('request');",
    "",
    "request({",
    `  method: '${n.method}',`,
    `  url: '${escSingle(n.url)}',`,
    headers,
    hasBody(n.method) && n.body ? `  body: ${JSON.stringify(n.body)},` : "",
    "}, (error, response, body) => {",
    "  if (error) throw new Error(error);",
    "  console.log(body);",
    "});",
  ]
    .filter(Boolean)
    .join("\n");
}

function genNodeUnirest(n: NormalizedRequest): string {
  const headers =
    n.headers.length > 0
      ? `  .headers({\n${n.headers.map((h) => `    '${escSingle(h.key)}': '${escSingle(h.value)}',`).join("\n")}\n  })`
      : "";
  return [
    "const unirest = require('unirest');",
    "",
    `unirest('${n.method}', '${escSingle(n.url)}')`,
    headers,
    hasBody(n.method) && n.body ? `  .send(${JSON.stringify(n.body)})` : "",
    "  .end(res => console.log(res.body));",
  ]
    .filter(Boolean)
    .join("\n");
}

function genObjc(n: NormalizedRequest): string {
  const headers = n.headers
    .map(
      (h) =>
        `[request setValue:@"${escDouble(h.value)}" forHTTPHeaderField:@"${escDouble(h.key)}"];`,
    )
    .join("\n");
  return [
    `NSURL *url = [NSURL URLWithString:@"${escDouble(n.url)}"];`,
    "NSMutableURLRequest *request = [NSMutableURLRequest requestWithURL:url];",
    `[request setHTTPMethod:@"${n.method}"];`,
    headers,
    hasBody(n.method) && n.body
      ? `[request setHTTPBody:[@"${escDouble(n.body)}" dataUsingEncoding:NSUTF8StringEncoding]];`
      : "",
    "NSURLSessionDataTask *task = [[NSURLSession sharedSession] dataTaskWithRequest:request",
    "  completionHandler:^(NSData *data, NSURLResponse *response, NSError *error) {",
    "    NSLog(@\"%@\", [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding]);",
    "  }];",
    "[task resume];",
  ]
    .filter(Boolean)
    .join("\n");
}

function genOcaml(n: NormalizedRequest): string {
  return [
    "open Lwt",
    "open Cohttp",
    "open Cohttp_lwt_unix",
    "",
    "let () =",
    "  let body =",
    hasBody(n.method) && n.body
      ? `    Cohttp_lwt.Body.of_string ${JSON.stringify(n.body)}`
      : "    `Empty",
    "  in",
    `  Client.call ~body \`${n.method} (Uri.of_string "${escDouble(n.url)}")`,
    "  >>= fun (_resp, body) ->",
    "  body |> Cohttp_lwt.Body.to_string >|= fun body ->",
    '  print_endline ("Body: " ^ body)',
    "  |> ignore",
  ].join("\n");
}

function genPhpCurl(n: NormalizedRequest): string {
  const headers = n.headers.map((h) => `  "${escDouble(`${h.key}: ${h.value}`)}",`).join("\n");
  return [
    "<?php",
    "$curl = curl_init();",
    "",
    "curl_setopt_array($curl, [",
    `  CURLOPT_URL => '${escSingle(n.url)}',`,
    "  CURLOPT_RETURNTRANSFER => true,",
    `  CURLOPT_CUSTOMREQUEST => '${n.method}',`,
    headers ? `  CURLOPT_HTTPHEADER => [\n${headers}\n  ],` : "",
    hasBody(n.method) && n.body ? `  CURLOPT_POSTFIELDS => ${JSON.stringify(n.body)},` : "",
    "]);",
    "",
    "$response = curl_exec($curl);",
    "curl_close($curl);",
    "echo $response;",
  ]
    .filter(Boolean)
    .join("\n");
}

function genPhpGuzzle(n: NormalizedRequest): string {
  const headers =
    n.headers.length > 0
      ? `    'headers' => [\n${n.headers.map((h) => `        '${escSingle(h.key)}' => '${escSingle(h.value)}',`).join("\n")}\n    ],`
      : "";
  return [
    "<?php",
    "$client = new \\GuzzleHttp\\Client();",
    `$response = $client->request('${n.method}', '${escSingle(n.url)}', [`,
    headers,
    hasBody(n.method) && n.body ? `    'body' => ${JSON.stringify(n.body)},` : "",
    "]);",
    "echo $response->getBody();",
  ]
    .filter(Boolean)
    .join("\n");
}

function genPhpHttpRequest2(n: NormalizedRequest): string {
  return [
    "<?php",
    "require_once 'HTTP/Request2.php';",
    `$request = new HTTP_Request2('${escSingle(n.url)}');`,
    `$request->setMethod(HTTP_Request2::METHOD_${n.method});`,
    ...n.headers.map(
      (h) => `$request->setHeader('${escSingle(h.key)}', '${escSingle(h.value)}');`,
    ),
    hasBody(n.method) && n.body ? `$request->setBody(${JSON.stringify(n.body)});` : "",
    "$response = $request->send();",
    "echo $response->getBody();",
  ]
    .filter(Boolean)
    .join("\n");
}

function genPhpPeclHttp(n: NormalizedRequest): string {
  return [
    "<?php",
    `$client = new http\\Client();`,
    `$request = new http\\Client\\Request('${n.method}', '${escSingle(n.url)}');`,
    ...n.headers.map(
      (h) => `$request->setHeaders(['${escSingle(h.key)}' => '${escSingle(h.value)}']);`,
    ),
    hasBody(n.method) && n.body ? `$request->getBody()->append(${JSON.stringify(n.body)});` : "",
    "$client->enqueue($request)->send();",
    "$response = $client->getResponse();",
    "echo $response->getBody();",
  ]
    .filter(Boolean)
    .join("\n");
}

function genPostmanCli(n: NormalizedRequest, request: HttpRequestDraft): string {
  // Approximate newman/postman collection runner one-liner using curl-like echo
  return [
    `# Run with Postman CLI (newman)`,
    `# Save this request into a collection, then:`,
    `postman collection run ./collection.json --folder "${escDouble(request.name || "Request")}"`,
    "",
    `# Or equivalent HTTP call:`,
    requestToCurl(request),
  ].join("\n");
}

function genPowerShell(n: NormalizedRequest): string {
  const headers =
    n.headers.length > 0
      ? `$headers = @{${n.headers.map((h) => `\n  "${escDouble(h.key)}" = "${escDouble(h.value)}"`).join(";")}\n}\n`
      : "$headers = @{}\n";
  return [
    headers.trimEnd(),
    "",
    hasBody(n.method) && n.body
      ? `$body = @'\n${n.body}\n'@`
      : "",
    "",
    `$response = Invoke-RestMethod -Uri '${escSingle(n.url)}' -Method ${n.method} -Headers $headers${
      hasBody(n.method) && n.body ? " -Body $body" : ""
    }`,
    "$response",
  ]
    .filter(Boolean)
    .join("\n");
}

function genPythonHttpClient(n: NormalizedRequest): string {
  let parsed: URL;
  try {
    parsed = new URL(n.url);
  } catch {
    parsed = new URL("https://example.com");
  }
  const headers =
    n.headers.length > 0
      ? `headers = {\n${n.headers.map((h) => `    '${escSingle(h.key)}': '${escSingle(h.value)}',`).join("\n")}\n}\n`
      : "headers = {}\n";
  return [
    "import http.client",
    "",
    headers.trimEnd(),
    "",
    hasBody(n.method) && n.body ? `payload = ${JSON.stringify(n.body)}` : "payload = ''",
    "",
    `conn = http.client.HTTPSConnection("${escDouble(parsed.hostname)}"${parsed.port ? `, ${parsed.port}` : ""})`,
    `conn.request("${n.method}", "${escDouble(parsed.pathname + parsed.search)}", payload, headers)`,
    "res = conn.getresponse()",
    "print(res.read().decode())",
  ].join("\n");
}

function genPythonRequests(n: NormalizedRequest): string {
  const headers =
    n.headers.length > 0
      ? `headers = {\n${n.headers.map((h) => `    '${escSingle(h.key)}': '${escSingle(h.value)}',`).join("\n")}\n}\n`
      : "headers = {}\n";
  return [
    "import requests",
    "",
    headers.trimEnd(),
    "",
    hasBody(n.method) && n.body ? `payload = ${JSON.stringify(n.body)}` : "",
    "",
    `response = requests.request("${n.method}", "${escDouble(n.url)}", headers=headers${
      hasBody(n.method) && n.body ? ", data=payload" : ""
    })`,
    "print(response.text)",
  ]
    .filter(Boolean)
    .join("\n");
}

function genRHttr(n: NormalizedRequest): string {
  const headers =
    n.headers.length > 0
      ? `add_headers(${n.headers.map((h) => `\`${h.key}\` = '${escSingle(h.value)}'`).join(", ")})`
      : "NULL";
  return [
    'library(httr)',
    "",
    `response <- VERB("${n.method}", url = "${escDouble(n.url)}", ${headers}${
      hasBody(n.method) && n.body ? `, body = ${JSON.stringify(n.body)}` : ""
    })`,
    "content(response, 'text')",
  ].join("\n");
}

function genRCurl(n: NormalizedRequest): string {
  const headers =
    n.headers.length > 0
      ? `c(${n.headers.map((h) => `"${escDouble(h.key)}" = "${escDouble(h.value)}"`).join(", ")})`
      : "NULL";
  return [
    "library(RCurl)",
    "",
    `response <- getURL("${escDouble(n.url)}",`,
    `  customrequest = "${n.method}",`,
    `  httpheader = ${headers}${hasBody(n.method) && n.body ? `,\n  postfields = ${JSON.stringify(n.body)}` : ""}`,
    ")",
    "cat(response)",
  ].join("\n");
}

function genRuby(n: NormalizedRequest): string {
  let parsed: URL;
  try {
    parsed = new URL(n.url);
  } catch {
    parsed = new URL("https://example.com");
  }
  return [
    "require 'uri'",
    "require 'net/http'",
    "",
    `url = URI("${escDouble(n.url)}")`,
    "",
    "http = Net::HTTP.new(url.host, url.port)",
    `http.use_ssl = ${parsed.protocol === "https:"}`,
    "",
    `request = Net::HTTP::${rubyClass(n.method)}.new(url)`,
    ...n.headers.map((h) => `request["${escDouble(h.key)}"] = "${escDouble(h.value)}"`),
    hasBody(n.method) && n.body ? `request.body = ${JSON.stringify(n.body)}` : "",
    "",
    "response = http.request(request)",
    "puts response.read_body",
  ]
    .filter(Boolean)
    .join("\n");
}

function rubyClass(method: string): string {
  const map: Record<string, string> = {
    GET: "Get",
    POST: "Post",
    PUT: "Put",
    PATCH: "Patch",
    DELETE: "Delete",
    HEAD: "Head",
    OPTIONS: "Options",
  };
  return map[method] ?? "Get";
}

function genRust(n: NormalizedRequest): string {
  const headers = n.headers
    .map((h) => `        .header("${escDouble(h.key)}", "${escDouble(h.value)}")`)
    .join("\n");
  return [
    "use reqwest;",
    "",
    "#[tokio::main]",
    "async fn main() -> Result<(), Box<dyn std::error::Error>> {",
    "    let client = reqwest::Client::new();",
    "    let res = client",
    `        .request(reqwest::Method::${n.method}, "${escDouble(n.url)}")`,
    headers,
    hasBody(n.method) && n.body ? `        .body(${JSON.stringify(n.body)})` : "",
    "        .send()",
    "        .await?",
    "        .text()",
    "        .await?;",
    "    println!(\"{}\", res);",
    "    Ok(())",
    "}",
  ]
    .filter(Boolean)
    .join("\n");
}

function genHttpie(n: NormalizedRequest): string {
  const headers = n.headers.map((h) => `${h.key}:"${h.value}"`).join(" ");
  if (hasBody(n.method) && n.body) {
    return `echo ${JSON.stringify(n.body)} | http ${n.method} ${n.url} ${headers}`.trim();
  }
  return `http ${n.method} ${n.url} ${headers}`.trim();
}

function genWget(n: NormalizedRequest): string {
  const headers = n.headers.map((h) => `--header='${escSingle(`${h.key}: ${h.value}`)}'`).join(" ");
  const body =
    hasBody(n.method) && n.body
      ? `--method=${n.method} --body-data='${escSingle(n.body)}'`
      : `--method=${n.method}`;
  return `wget ${body} ${headers} '${escSingle(n.url)}' -O -`.replace(/\s+/g, " ").trim();
}

function genSwift(n: NormalizedRequest): string {
  const headers = n.headers
    .map((h) => `request.setValue("${escDouble(h.value)}", forHTTPHeaderField: "${escDouble(h.key)}")`)
    .join("\n");
  return [
    `var request = URLRequest(url: URL(string: "${escDouble(n.url)}")!, timeoutInterval: 60)`,
    `request.httpMethod = "${n.method}"`,
    headers,
    hasBody(n.method) && n.body
      ? `request.httpBody = ${JSON.stringify(n.body)}.data(using: .utf8)`
      : "",
    "",
    "let task = URLSession.shared.dataTask(with: request) { data, _, error in",
    "  guard let data else {",
    "    print(String(describing: error))",
    "    return",
    "  }",
    "  print(String(data: data, encoding: .utf8) ?? \"\")",
    "}",
    "task.resume()",
  ]
    .filter(Boolean)
    .join("\n");
}

export function generateSnippet(id: SnippetId, request: HttpRequestDraft): string {
  const n = normalizeRequest(request);
  switch (id) {
    case "c-libcurl":
      return genCLibcurl(n);
    case "csharp-httpclient":
      return genCsharpHttpClient(n);
    case "csharp-restsharp":
      return genCsharpRestSharp(n);
    case "curl":
      return requestToCurl(request);
    case "dart-dio":
      return genDartDioClean(n);
    case "dart-http":
      return genDartHttp(n);
    case "go-native":
      return genGoNative(n);
    case "http":
      return genHttp(n);
    case "java-okhttp":
      return genJavaOkHttp(n);
    case "java-unirest":
      return genJavaUnirest(n);
    case "js-fetch":
      return genJsFetch(n);
    case "js-jquery":
      return genJsJquery(n);
    case "js-xhr":
      return genJsXhr(n);
    case "kotlin-okhttp":
      return genKotlinOkHttp(n);
    case "nodejs-axios":
      return genNodeAxios(n);
    case "nodejs-native":
      return genNodeNative(n);
    case "nodejs-request":
      return genNodeRequest(n);
    case "nodejs-unirest":
      return genNodeUnirest(n);
    case "objc-nsurlsession":
      return genObjc(n);
    case "ocaml-cohttp":
      return genOcaml(n);
    case "php-curl":
      return genPhpCurl(n);
    case "php-guzzle":
      return genPhpGuzzle(n);
    case "php-httprequest2":
      return genPhpHttpRequest2(n);
    case "php-pecl-http":
      return genPhpPeclHttp(n);
    case "postman-cli":
      return genPostmanCli(n, request);
    case "powershell-restmethod":
      return genPowerShell(n);
    case "python-httpclient":
      return genPythonHttpClient(n);
    case "python-requests":
      return genPythonRequests(n);
    case "r-httr":
      return genRHttr(n);
    case "r-rcurl":
      return genRCurl(n);
    case "ruby-nethttp":
      return genRuby(n);
    case "rust-reqwest":
      return genRust(n);
    case "shell-httpie":
      return genHttpie(n);
    case "shell-wget":
      return genWget(n);
    case "swift-urlsession":
      return genSwift(n);
    default:
      return requestToCurl(request);
  }
}
