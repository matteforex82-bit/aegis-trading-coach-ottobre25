"use client"

import { useState, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { ImportPreview } from "./ImportPreview"
import { Upload, FileText, Loader2, AlertCircle, CheckCircle2 } from "lucide-react"

type UploadState = "idle" | "validating" | "previewing" | "importing" | "success"

export function ImportSetupsTab({ onSuccess }: { onSuccess?: () => void }) {
  const [uploadState, setUploadState] = useState<UploadState>("idle")
  const [yamlContent, setYamlContent] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [previewData, setPreviewData] = useState<any>(null)
  const [dragActive, setDragActive] = useState(false)
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const handleFile = async (file: File) => {
    // Validate file extension
    if (!file.name.endsWith(".yml") && !file.name.endsWith(".yaml")) {
      toast({
        title: "Invalid file type",
        description: "Please upload a .yml or .yaml file",
        variant: "destructive",
      })
      return
    }

    setFileName(file.name)
    setUploadState("validating")

    try {
      // Read file content
      const text = await file.text()
      setYamlContent(text)

      // Validate with API
      const response = await fetch("/api/admin/trading-setups/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ yamlContent: text }),
      })

      if (!response.ok) {
        throw new Error("Validation request failed")
      }

      const data = await response.json()
      setPreviewData(data)
      setUploadState("previewing")

      // Show toast based on validation result
      if (data.valid && data.stats.errors === 0) {
        toast({
          title: "File validated successfully",
          description: `Found ${data.stats.total} setups ready to import`,
        })
      } else if (data.stats.errors > 0) {
        toast({
          title: "Validation errors found",
          description: `${data.stats.errors} setup(s) have validation errors`,
          variant: "destructive",
        })
      }
    } catch (error: any) {
      console.error("Error validating file:", error)
      toast({
        title: "Validation failed",
        description: error.message || "Failed to validate YAML file",
        variant: "destructive",
      })
      setUploadState("idle")
      setYamlContent(null)
      setFileName(null)
    }
  }

  const handleConfirmImport = async () => {
    if (!yamlContent) return

    setImporting(true)

    try {
      const response = await fetch("/api/admin/trading-setups/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ yamlContent }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Import failed")
      }

      const data = await response.json()

      setUploadState("success")
      setImporting(false)

      toast({
        title: "Import successful!",
        description: `Imported ${data.result.inserted} new, updated ${data.result.updated} existing setups`,
      })

      // Call onSuccess callback if provided
      if (onSuccess) {
        setTimeout(() => {
          onSuccess()
        }, 1500)
      }
    } catch (error: any) {
      console.error("Error importing setups:", error)
      toast({
        title: "Import failed",
        description: error.message || "Failed to import trading setups",
        variant: "destructive",
      })
      setImporting(false)
    }
  }

  const handleCancel = () => {
    setUploadState("idle")
    setYamlContent(null)
    setFileName(null)
    setPreviewData(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleReset = () => {
    handleCancel()
  }

  // Render different states
  if (uploadState === "success") {
    return (
      <Card className="border-green-500/50 bg-green-500/5">
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <CheckCircle2 className="h-16 w-16 text-green-600" />
            <div>
              <h3 className="text-xl font-semibold text-green-600">Import Successful!</h3>
              <p className="text-muted-foreground mt-2">
                Trading setups have been imported successfully
              </p>
            </div>
            <Button onClick={handleReset} variant="outline">
              Import Another File
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (uploadState === "previewing" && previewData) {
    return (
      <ImportPreview
        items={previewData.items}
        stats={previewData.stats}
        parseErrors={previewData.parseErrors}
        onConfirm={handleConfirmImport}
        onCancel={handleCancel}
        loading={importing}
      />
    )
  }

  // Upload/Validating state
  return (
    <div className="space-y-6">
      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Import Trading Setups from YAML</CardTitle>
          <CardDescription>
            Upload a YAML file containing your Elliott Wave trading setups. The file will be
            validated and you'll see a preview before importing.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-start gap-2">
              <div className="bg-primary/10 rounded-full p-2">
                <FileText className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium">1. Prepare YAML File</p>
                <p className="text-muted-foreground text-xs">
                  Use the template in <code>data/trading-setups.example.yml</code>
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="bg-primary/10 rounded-full p-2">
                <Upload className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium">2. Upload & Preview</p>
                <p className="text-muted-foreground text-xs">
                  Drag & drop or click to upload your YAML file
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="bg-primary/10 rounded-full p-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium">3. Confirm Import</p>
                <p className="text-muted-foreground text-xs">
                  Review changes and confirm to import
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload Area */}
      <Card>
        <CardContent className="pt-6">
          <div
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
              dragActive
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50"
            } ${uploadState === "validating" ? "opacity-50 pointer-events-none" : ""}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".yml,.yaml"
              onChange={handleChange}
              disabled={uploadState === "validating"}
            />

            {uploadState === "validating" ? (
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <div>
                  <p className="text-lg font-medium">Validating file...</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Please wait while we validate your YAML file
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div className="bg-primary/10 rounded-full p-4">
                  <Upload className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <p className="text-lg font-medium">
                    {dragActive ? "Drop file here" : "Drag & drop your YAML file"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">or</p>
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                    className="mt-3"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Browse Files
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground">
                  Supported formats: .yml, .yaml
                </div>
              </div>
            )}
          </div>

          {fileName && uploadState !== "validating" && (
            <div className="mt-4 flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Selected file:</span>
              <span className="font-medium">{fileName}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Help */}
      <Card className="border-blue-500/50 bg-blue-500/5">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            Need Help?
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p className="text-muted-foreground">
            • Download the example template:{" "}
            <code className="bg-muted px-1 py-0.5 rounded">
              data/trading-setups.example.yml
            </code>
          </p>
          <p className="text-muted-foreground">
            • Read the README for detailed instructions:{" "}
            <code className="bg-muted px-1 py-0.5 rounded">data/README.md</code>
          </p>
          <p className="text-muted-foreground">
            • Duplicate detection is based on: <strong>symbol + entryPrice + stopLoss</strong>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
