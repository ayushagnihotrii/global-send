package com.globalsend.app.data.api

import com.globalsend.app.data.model.*
import okhttp3.MultipartBody
import okhttp3.RequestBody
import okhttp3.ResponseBody
import retrofit2.Response
import retrofit2.http.*

interface GlobalSendApiService {

    // --- AUTHENTICATION ---
    @POST("api/auth/login")
    suspend fun login(@Body request: LoginRequest): Response<LoginResponse>

    @POST("api/auth/register")
    suspend fun register(@Body request: RegisterRequest): Response<RegisterResponse>

    @GET("api/auth/me")
    suspend fun getMe(): Response<LoginResponse>

    @POST("api/auth/logout")
    suspend fun logout(): Response<GenericResponse>

    @GET("api/auth/recovery/question")
    suspend fun getRecoveryQuestion(@Query("username") username: String): Response<RecoveryQuestionResponse>

    @POST("api/auth/recovery/reset")
    suspend fun resetKey(@Body request: ResetKeyRequest): Response<ResetKeyResponse>

    @POST("api/user/security-question")
    suspend fun setupSecurityQuestion(@Body request: SecurityQuestionSetupRequest): Response<GenericResponse>

    // --- ITEMS / VAULT ---
    @GET("api/items")
    suspend fun getItems(
        @Query("type") type: String? = null,
        @Query("favourite") favourite: Boolean? = null,
        @Query("inTrash") inTrash: Boolean? = null,
        @Query("search") search: String? = null,
        @Query("tag") tag: String? = null
    ): Response<ItemsResponse>

    @GET("api/items/{id}")
    suspend fun getItemById(@Path("id") id: String): Response<SingleItemResponse>

    @POST("api/items")
    suspend fun createTextItem(@Body request: CreateTextItemRequest): Response<SingleItemResponse>

    @POST("api/items")
    suspend fun createLinkItem(@Body request: CreateLinkItemRequest): Response<SingleItemResponse>

    @POST("api/items/{id}/favourite")
    suspend fun toggleFavourite(@Path("id") id: String): Response<GenericResponse>

    @POST("api/items/{id}/restore")
    suspend fun restoreItem(@Path("id") id: String): Response<GenericResponse>

    @DELETE("api/items/{id}")
    suspend fun deleteItem(
        @Path("id") id: String,
        @Query("permanent") permanent: Boolean = false
    ): Response<GenericResponse>

    @DELETE("api/items/trash/empty")
    suspend fun emptyTrash(): Response<GenericResponse>

    // --- FILE UPLOADS & STORAGE ---
    @Multipart
    @POST("api/storage/upload")
    suspend fun uploadFile(
        @Part file: MultipartBody.Part,
        @Part("title") title: RequestBody?,
        @Part("tags") tags: RequestBody?,
        @Part("expirationSeconds") expirationSeconds: RequestBody?
    ): Response<SingleItemResponse>

    @GET("api/user/storage")
    suspend fun getStorageUsage(): Response<StorageUsageResponse>

    @GET("api/user/export")
    suspend fun exportVault(): Response<ResponseBody>

    // --- ENCRYPTED MESSAGING / CHATS ---
    @GET("api/chats")
    suspend fun getConversations(): Response<ConversationsResponse>

    @POST("api/chats")
    suspend fun startConversation(@Body request: StartConversationRequest): Response<StartConversationResponse>

    @GET("api/chats/{id}")
    suspend fun getConversationMessages(@Path("id") id: String): Response<ConversationMessagesResponse>

    @POST("api/chats/{id}")
    suspend fun sendMessage(
        @Path("id") id: String,
        @Body request: SendMessageRequest
    ): Response<SendMessageResponse>

    @DELETE("api/chats/{id}")
    suspend fun deleteConversation(@Path("id") id: String): Response<GenericResponse>

    @POST("api/chats/block")
    suspend fun blockUser(@Body request: BlockUserRequest): Response<GenericResponse>
}
