{{- define "aigovops.name" -}}{{ .Release.Name }}-gate{{- end -}}
{{- define "aigovops.labels" -}}
app: aigovops-gate
app.kubernetes.io/name: aigovops
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end -}}
