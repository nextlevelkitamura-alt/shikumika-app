"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Calendar, Check, X, RefreshCw } from "lucide-react"

interface CalendarStatus {
  isConnected: boolean
  isSyncEnabled: boolean
  syncStatus: 'idle' | 'syncing' | 'error'
  lastSyncedAt: string | null
}

export function CalendarSettings() {
  const [status, setStatus] = useState<CalendarStatus>({
    isConnected: false,
    isSyncEnabled: false,
    syncStatus: 'idle',
    lastSyncedAt: null
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchStatus()
  }, [])

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/calendar/status')
      if (response.ok) {
        const data = await response.json()
        setStatus(data)
      }
    } catch (error) {
      console.error('Failed to fetch calendar status:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleConnect = () => {
    // Redirect to OAuth flow
    window.location.href = '/api/calendar/connect'
  }

  const handleDisconnect = async () => {
    if (!confirm('Googleカレンダーとの連携を解除しますか？\n保存されているトークンが削除されます。')) {
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/calendar/disconnect', {
        method: 'POST'
      })

      if (response.ok) {
        setStatus({
          isConnected: false,
          isSyncEnabled: false,
          syncStatus: 'idle',
          lastSyncedAt: null
        })
        alert('連携を解除しました。再度連携する場合は「連携」ボタンをクリックしてください。')
      } else {
        throw new Error('Failed to disconnect')
      }
    } catch (error) {
      console.error('Failed to disconnect calendar:', error)
      alert('連携解除に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-2">
        <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="p-2 space-y-2">
      {!status.isConnected ? (
        <Button
          onClick={handleConnect}
          size="sm"
          className="w-full h-8 text-xs"
          variant="outline"
        >
          <Calendar className="w-3.5 h-3.5 mr-2" />
          Googleカレンダーと連携
        </Button>
      ) : (
        <>
          <div className="flex items-center justify-between px-2 py-1 bg-muted/50 rounded text-xs">
            <div className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-green-500" />
              <span className="text-muted-foreground">連携済み</span>
            </div>
            {status.syncStatus === 'syncing' && (
              <RefreshCw className="w-3 h-3 animate-spin text-blue-500" />
            )}
            {status.syncStatus === 'error' && (
              <X className="w-3 h-3 text-red-500" />
            )}
          </div>
          <Button
            onClick={handleDisconnect}
            size="sm"
            variant="ghost"
            className="w-full h-7 text-xs text-muted-foreground hover:text-destructive"
          >
            連携解除
          </Button>
        </>
      )}
      {status.lastSyncedAt && (
        <p className="text-[10px] text-muted-foreground text-center">
          最終同期: {new Date(status.lastSyncedAt).toLocaleString('ja-JP', {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </p>
      )}
    </div>
  )
}
